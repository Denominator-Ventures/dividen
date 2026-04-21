export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

const PHASE_NAMES: Record<number, string> = {
  0: 'api-key',
  1: 'divi-settings',
  2: 'email-setup',
  3: 'connected-overview',
  4: 'webhooks',
  5: 'propagation',
  6: 'complete',
};

/**
 * GET /api/onboarding/phase
 * Returns the current onboarding phase + context for the user.
 */
async function _GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingPhase: true,
        hasCompletedOnboarding: true,
        hasSeenWalkthrough: true,
        diviName: true,
        workingStyle: true,
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Check integrations for context
    const integrations = await prisma.integrationAccount.findMany({
      where: { userId, isActive: true },
      select: { service: true, identity: true, provider: true, emailAddress: true },
    });

    const hasGoogleConnected = integrations.some((i: any) => i.provider === 'google');
    const googleAccounts = integrations.filter((i: any) => i.provider === 'google' && i.service === 'email');
    const operatorAccounts = googleAccounts.filter((i: any) => i.identity === 'operator');
    const agentAccounts = googleAccounts.filter((i: any) => i.identity === 'agent');

    // Check if API key exists
    const apiKeyCount = await prisma.agentApiKey.count({ where: { userId, isActive: true } });

    // Check webhooks
    const webhookCount = await prisma.webhook.count({ where: { userId } }).catch(() => 0);

    return NextResponse.json({
      success: true,
      data: {
        phase: user.onboardingPhase,
        phaseName: PHASE_NAMES[user.onboardingPhase] || 'unknown',
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        hasApiKey: apiKeyCount > 0,
        hasGoogleConnected,
        operatorGmailCount: operatorAccounts.length,
        agentGmailCount: agentAccounts.length,
        webhookCount,
        diviName: user.diviName,
        workingStyle: user.workingStyle ? JSON.parse(String(user.workingStyle)) : null,
      },
    });
  } catch (error: any) {
    console.error('GET /api/onboarding/phase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/onboarding/phase
 * Advance or set the onboarding phase.
 * Body: { phase?: number, action?: 'advance' | 'skip' | 'set', settings?: any }
 */
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const { phase, action = 'advance', settings } = body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingPhase: true },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let newPhase = user.onboardingPhase;

    if (action === 'set' && typeof phase === 'number') {
      newPhase = Math.min(Math.max(phase, 0), 6);
    } else if (action === 'advance' || action === 'skip') {
      newPhase = Math.min(user.onboardingPhase + 1, 6);
    }

    // Apply any settings that came with this phase completion
    if (settings) {
      await applyPhaseSettings(userId, user.onboardingPhase, settings);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingPhase: newPhase,
        // Mark onboarding complete when all phases done
        ...(newPhase >= 6 ? { hasCompletedOnboarding: true } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        previousPhase: user.onboardingPhase,
        currentPhase: newPhase,
        phaseName: PHASE_NAMES[newPhase] || 'unknown',
        isComplete: newPhase >= 6,
      },
    });
  } catch (error: any) {
    console.error('POST /api/onboarding/phase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Apply settings associated with completing a specific phase.
 */
async function applyPhaseSettings(userId: string, phase: number, settings: any) {
  switch (phase) {
    case 1: {
      // Phase 1 (divi-settings): workingStyle, diviName, identity preferences
      const updates: any = {};
      if (settings.workingStyle) updates.workingStyle = JSON.stringify(settings.workingStyle);
      if (settings.diviName) updates.diviName = settings.diviName;
      if (settings.triageSettings) updates.triageSettings = JSON.stringify(settings.triageSettings);
      if (settings.goalsEnabled !== undefined) updates.goalsEnabled = settings.goalsEnabled;

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({ where: { id: userId }, data: updates });
      }

      // Save identity preference as a memory item
      if (settings.identityPreference) {
        await prisma.memoryItem.upsert({
          where: { userId_key: { userId, key: 'divi_identity_preference' } },
          update: { value: JSON.stringify(settings.identityPreference) },
          create: {
            tier: 1,
            category: 'general',
            key: 'divi_identity_preference',
            value: JSON.stringify(settings.identityPreference),
            approved: true,
            source: 'onboarding',
            userId,
          },
        }).catch(() => {});
      }
      break;
    }
    case 2: {
      // Phase 2 (email-setup): nothing to apply — OAuth handles it
      break;
    }
    default:
      break;
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
