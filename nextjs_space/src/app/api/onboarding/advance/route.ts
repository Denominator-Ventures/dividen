export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getPhase1Message, getPhase1Widgets,
  getPhase2Message, getPhase2Widgets,
  getPhase3Message,
  getPhase4Message, getPhase4Widgets,
  getPhase5Message, getPhase5Widgets,
  getCompletionMessage,
} from '@/lib/onboarding-phases';

/**
 * POST /api/onboarding/advance
 * 
 * Generates the next onboarding phase message from Divi and saves it to chat.
 * Called when transitioning between phases.
 * 
 * Body: { settings?: any } — any settings from the completed phase
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json().catch(() => ({}));
    const { settings, action = 'advance' } = body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingPhase: true, diviName: true, workingStyle: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let currentPhase = user.onboardingPhase;

    // Apply settings from the just-completed phase
    if (settings && action !== 'init') {
      await applySettings(userId, currentPhase, settings);
    }

    // Advance phase unless this is an init call (just getting current phase content)
    if (action !== 'init') {
      currentPhase = Math.min(currentPhase + 1, 6);
      await prisma.user.update({
        where: { id: userId },
        data: {
          onboardingPhase: currentPhase,
          ...(currentPhase >= 6 ? { hasCompletedOnboarding: true } : {}),
        },
      });
    }

    // Generate content for the new current phase
    const phaseContent = await generatePhaseContent(userId, currentPhase, user.diviName || 'Divi');

    if (phaseContent) {
      // Save as assistant message with onboarding metadata
      await prisma.chatMessage.create({
        data: {
          role: 'assistant',
          content: phaseContent.message,
          userId,
          metadata: JSON.stringify({
            onboardingPhase: currentPhase,
            widgets: phaseContent.widgets,
            isOnboarding: true,
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        phase: currentPhase,
        message: phaseContent?.message || '',
        widgets: phaseContent?.widgets || [],
        isComplete: currentPhase >= 6,
      },
    });
  } catch (error: any) {
    console.error('POST /api/onboarding/advance error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generatePhaseContent(userId: string, phase: number, diviName: string) {
  switch (phase) {
    case 1: {
      // Phase 1: Divi settings walkthrough
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { workingStyle: true },
      });
      const ws = user?.workingStyle ? JSON.parse(String(user.workingStyle)) : null;
      return {
        message: getPhase1Message(diviName),
        widgets: getPhase1Widgets(ws),
      };
    }
    case 2: {
      // Phase 2: Email setup
      const integrations = await prisma.integrationAccount.findMany({
        where: { userId, isActive: true, provider: 'google', service: 'email' },
        select: { identity: true, emailAddress: true, accountIndex: true },
      });
      const operatorCount = integrations.filter((i: any) => i.identity === 'operator').length;
      const agentCount = integrations.filter((i: any) => i.identity === 'agent').length;
      const connectedEmails = integrations
        .filter((i: any) => i.identity === 'operator' && i.emailAddress)
        .map((i: any) => i.emailAddress);

      // Get identity preference from memory
      const prefMem = await prisma.memoryItem.findUnique({
        where: { userId_key: { userId, key: 'divi_identity_preference' } },
      }).catch(() => null);
      let identityPref = 'shared';
      try { identityPref = prefMem?.value ? JSON.parse(prefMem.value) : 'shared'; } catch { identityPref = prefMem?.value || 'shared'; }

      return {
        message: getPhase2Message(),
        widgets: getPhase2Widgets(operatorCount, agentCount, identityPref, connectedEmails),
      };
    }
    case 3: {
      // Phase 3: Connected overview
      const services = await prisma.integrationAccount.findMany({
        where: { userId, isActive: true, provider: 'google' },
        select: { service: true },
      });
      return {
        message: getPhase3Message(services.map((s: any) => s.service)),
        widgets: [
          { type: 'submit' as const, id: 'phase3_submit', submitLabel: 'Continue \u2192' },
        ],
      };
    }
    case 4: {
      // Phase 4: Webhooks
      return {
        message: getPhase4Message(),
        widgets: getPhase4Widgets(),
      };
    }
    case 5: {
      // Phase 5: Propagation
      const integ = await prisma.integrationAccount.findMany({
        where: { userId, isActive: true, provider: 'google' },
        select: { service: true },
      });
      const svcSet = new Set(integ.map((i: any) => i.service));
      return {
        message: getPhase5Message(svcSet.has('email'), svcSet.has('calendar'), svcSet.has('drive')),
        widgets: getPhase5Widgets(svcSet.size > 0),
      };
    }
    case 6: {
      // Complete
      return {
        message: getCompletionMessage(diviName),
        widgets: [],
      };
    }
    default:
      return null;
  }
}

async function applySettings(userId: string, phase: number, settings: any) {
  if (phase === 1 && settings) {
    const updates: any = {};
    if (settings.workingStyle) updates.workingStyle = JSON.stringify(settings.workingStyle);
    if (settings.diviName) updates.diviName = settings.diviName;
    if (Object.keys(updates).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: updates });
    }
    if (settings.identityPreference) {
      await prisma.memoryItem.upsert({
        where: { userId_key: { userId, key: 'divi_identity_preference' } },
        update: { value: typeof settings.identityPreference === 'string' ? settings.identityPreference : JSON.stringify(settings.identityPreference) },
        create: {
          tier: 1, category: 'general', key: 'divi_identity_preference',
          value: typeof settings.identityPreference === 'string' ? settings.identityPreference : JSON.stringify(settings.identityPreference),
          approved: true, source: 'onboarding', userId,
        },
      }).catch(() => {});
    }
  }
}
