export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkAndAutoCompleteCard } from '@/lib/card-auto-complete';
import {
  getPhase1Message, getPhase1Widgets,
  getPhase2Message, getPhase2Widgets,
  getPhase3Message,
  getPhase4Message, getPhase4Widgets,
  getPhase5Message, getPhase5Widgets,
  getSettingsWidgets,
  type SettingsWidgetGroup,
} from '@/lib/onboarding-phases';

/**
 * POST /api/onboarding/advance
 * 
 * Generates the next onboarding phase message from Divi and saves it to chat.
 * Also handles showing settings widgets outside of onboarding.
 * 
 * Body:
 *   { action: 'advance' | 'skip' | 'init' | 'show_settings', settings?: any, settingsGroup?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json().catch(() => ({}));
    const { settings, action = 'advance', settingsGroup } = body;

    // ── Show Settings Widget (non-onboarding, can be called anytime) ─────
    if (action === 'show_settings') {
      return await handleShowSettings(userId, settingsGroup || 'all', settings);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingPhase: true, diviName: true, workingStyle: true, triageSettings: true, goalsEnabled: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let currentPhase = user.onboardingPhase;

    // Apply settings from the just-completed phase
    if (settings && action !== 'init') {
      await applySettings(userId, currentPhase, settings);
    }

    // Check if this is Phase 5 "Start Propagation" submit (triggers catch-up after advancing)
    const isPropagationSubmit = currentPhase === 5 && action === 'advance';

    // Advance phase unless this is an init call (re-generating current phase)
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

    // For init, check if a message for this phase already exists to avoid duplicates
    if (action === 'init') {
      const existing = await prisma.chatMessage.findFirst({
        where: {
          userId,
          role: 'assistant',
          metadata: { contains: `"onboardingPhase":${currentPhase}` },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        // Already have this phase's message, just return it
        const meta = existing.metadata ? JSON.parse(String(existing.metadata)) : {};
        return NextResponse.json({
          success: true,
          data: {
            phase: currentPhase,
            message: existing.content,
            widgets: meta.widgets || [],
            isComplete: currentPhase >= 6,
            existing: true,
          },
        });
      }
    }

    // Generate content for the current phase
    const phaseContent = await generatePhaseContent(userId, currentPhase, user);

    if (phaseContent) {
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

    // If this was Phase 5 propagation, inject a catch-up user message to trigger expanded catch-up
    if (isPropagationSubmit) {
      await prisma.chatMessage.create({
        data: {
          role: 'user',
          content: '[SYSTEM: Onboarding propagation — run expanded catch-up]',
          userId,
          metadata: JSON.stringify({ isOnboarding: true, propagation: true }),
        },
      });
      await prisma.chatMessage.create({
        data: {
          role: 'assistant',
          content: `🚀 **Propagation Started!**\n\nI'm now scanning and processing all your connected data sources. This is your first catch-up — I'll analyze everything and populate your Board, NOW panel, and CRM with what I find.\n\nOpen **"☀️ Catch me up"** from the chat to trigger a full catch-up anytime you want a fresh sweep.\n\nIn the meantime, feel free to explore the platform — your data will start appearing as I process it.`,
          userId,
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
        propagationTriggered: isPropagationSubmit,
      },
    });
  } catch (error: any) {
    console.error('POST /api/onboarding/advance error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Phase content generation ──────────────────────────────────────────────────

async function generatePhaseContent(
  userId: string,
  phase: number,
  user: { diviName: string | null; workingStyle: any; triageSettings: any; goalsEnabled: boolean },
) {
  const diviName = user.diviName || 'Divi';

  switch (phase) {
    case 1: {
      const ws = user.workingStyle ? JSON.parse(String(user.workingStyle)) : null;
      const ts = user.triageSettings ? JSON.parse(String(user.triageSettings)) : null;
      return {
        message: getPhase1Message(diviName),
        widgets: getPhase1Widgets(ws, ts, user.goalsEnabled, diviName),
      };
    }
    case 2: {
      const integrations = await prisma.integrationAccount.findMany({
        where: { userId, isActive: true, provider: 'google', service: 'email' },
        select: { identity: true, emailAddress: true, accountIndex: true },
      });
      const operatorCount = integrations.filter((i: any) => i.identity === 'operator').length;
      const agentCount = integrations.filter((i: any) => i.identity === 'agent').length;
      const connectedEmails = integrations
        .filter((i: any) => i.identity === 'operator' && i.emailAddress)
        .map((i: any) => i.emailAddress);

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
      const services = await prisma.integrationAccount.findMany({
        where: { userId, isActive: true, provider: 'google' },
        select: { service: true },
      });
      return {
        message: getPhase3Message(services.map((s: any) => s.service)),
        widgets: [{ type: 'submit' as const, id: 'phase3_submit', submitLabel: 'Continue \u2192' }],
      };
    }
    case 4:
      return { message: getPhase4Message(), widgets: getPhase4Widgets() };
    case 5: {
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
    case 6:
      // No hardcoded completion message — Divi recognizes completion naturally
      return null;
    default:
      return null;
  }
}

// ── Apply settings from a completed phase ─────────────────────────────────────

async function applySettings(userId: string, phase: number, settings: any) {
  // Phase 1 and show_settings both write the same fields
  if (!settings) return;

  const updates: any = {};
  if (settings.workingStyle) updates.workingStyle = JSON.stringify(settings.workingStyle);
  if (settings.diviName !== undefined && settings.diviName !== '') updates.diviName = settings.diviName;
  if (settings.triageSettings) updates.triageSettings = JSON.stringify(settings.triageSettings);
  if (typeof settings.goalsEnabled === 'boolean') updates.goalsEnabled = settings.goalsEnabled;

  if (Object.keys(updates).length > 0) {
    await prisma.user.update({ where: { id: userId }, data: updates });
  }

  // Save identity preference as memory item
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

// ── Show Settings Widget (callable anytime via action tag) ────────────────────

async function handleShowSettings(userId: string, group: string, settings?: any) {
  // If settings are being submitted (not just showing the widget)
  if (settings) {
    await applySettings(userId, -1, settings);

    // ── Auto-complete matching checklist tasks on setup card ──
    // Map settings groups to setup task text patterns
    const taskPatterns: Record<string, string> = {
      working_style: 'Working Style',
      triage: 'Triage Preferences',
      goals: 'Goals',
      identity: 'Working Style', // identity is part of working style setup
    };
    const pattern = taskPatterns[group];
    if (pattern) {
      // Find incomplete checklist items matching this pattern on active setup cards
      const matchingTasks = await prisma.checklistItem.findMany({
        where: {
          completed: false,
          text: { contains: pattern },
          card: {
            userId,
            status: { in: ['active', 'in_progress', 'development'] },
            OR: [
              { title: { contains: 'Setup' } },
              { project: { metadata: { contains: '"isSetupProject":true' } } },
            ],
          },
        },
        select: { id: true },
      });
      if (matchingTasks.length > 0) {
        await prisma.checklistItem.updateMany({
          where: { id: { in: matchingTasks.map(t => t.id) } },
          data: { completed: true },
        });
        // Check if completing these tasks auto-completes any cards
        const affectedCards = await prisma.checklistItem.findMany({
          where: { id: { in: matchingTasks.map(t => t.id) } },
          select: { cardId: true },
          distinct: ['cardId'],
        });
        for (const { cardId } of affectedCards) {
          await checkAndAutoCompleteCard(cardId, userId);
        }
      }
    }

    // Determine the next incomplete setup task (for conversational auto-continue)
    let nextTaskText: string | null = null;
    let allTasksComplete = false;
    if (taskPatterns[group]) {
      const nextTask = await prisma.checklistItem.findFirst({
        where: {
          completed: false,
          card: {
            userId,
            status: { in: ['active', 'in_progress', 'development'] },
            OR: [
              { title: { contains: 'Setup' } },
              { project: { metadata: { contains: '"isSetupProject":true' } } },
            ],
          },
        },
        orderBy: { order: 'asc' },
        select: { text: true },
      });
      if (nextTask) {
        nextTaskText = nextTask.text;
      } else {
        allTasksComplete = true;
      }
    }

    return NextResponse.json({ success: true, data: { saved: true, tasksCompleted: taskPatterns[group] ? true : false, nextTaskText, allTasksComplete } });
  }

  // Load current values and generate widget config
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workingStyle: true, triageSettings: true, goalsEnabled: true, diviName: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const ws = user.workingStyle ? JSON.parse(String(user.workingStyle)) : null;
  const ts = user.triageSettings ? JSON.parse(String(user.triageSettings)) : null;
  const widgets = getSettingsWidgets(
    (group as SettingsWidgetGroup) || 'all',
    ws, ts, user.goalsEnabled, user.diviName || 'Divi',
  );

  // Save as a chat message with the widget
  const message = group === 'all'
    ? `Here are your current settings. Adjust anything and hit save:`
    : `Here are your ${group.replace('_', ' ')} settings. Adjust and save:`;

  await prisma.chatMessage.create({
    data: {
      role: 'assistant',
      content: message,
      userId,
      metadata: JSON.stringify({
        isOnboarding: true, // Reuse the widget renderer
        onboardingPhase: -1, // -1 = settings adjustment, not onboarding
        widgets,
        settingsGroup: group,
      }),
    },
  });

  return NextResponse.json({ success: true, data: { message, widgets, settingsGroup: group } });
}
