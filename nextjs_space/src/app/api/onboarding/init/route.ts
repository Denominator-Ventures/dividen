export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/onboarding/init
 * 
 * Called after user submits their API key on the dashboard.
 * 1. Creates an "active" onboarding project
 * 2. Seeds comprehensive setup tasks as QueueItems linked to that project
 * 3. Marks onboarding as complete (wizard dismissed)
 * 4. Returns the project ID and task IDs
 * 
 * The Divi intro message is triggered client-side via /api/chat/send after this returns.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const { apiKey, provider, agentName } = body;

    // ── Save API key if provided ──────────────────────────────────────────
    if (apiKey && provider) {
      // Deactivate any existing key for this provider
      await prisma.agentApiKey.updateMany({
        where: { userId, provider },
        data: { isActive: false },
      });

      await prisma.agentApiKey.create({
        data: {
          provider,
          apiKey: apiKey.trim(),
          label: 'Onboarding key',
          isActive: true,
          user: { connect: { id: userId } },
        },
      });
    }

    // ── Create onboarding project ─────────────────────────────────────────
    // Check if onboarding project already exists
    const existingProject = await prisma.project.findFirst({
      where: {
        createdById: userId,
        metadata: { contains: '"onboarding":true' },
      },
    });

    let project = existingProject;

    if (!project) {
      project = await prisma.project.create({
        data: {
          name: 'Getting Started with Divi',
          description: 'Your setup tasks to get Divi fully configured and working for you.',
          status: 'active',
          visibility: 'private',
          color: '#4f7cff',
          metadata: JSON.stringify({ onboarding: true }),
          createdById: userId,
          members: {
            create: { userId, role: 'lead' },
          },
        },
      });
    }

    // ── Define onboarding tasks ───────────────────────────────────────────
    // These are comprehensive setup steps that surface in NOW panel.
    // Each has a stepKey in metadata for tracking completion/skipping.
    const ONBOARDING_TASKS = [
      {
        title: 'Have your first conversation with Divi',
        description: 'Open the Chat tab and ask Divi anything — it already knows about your workspace and capabilities. Try: "What can you help me with?"',
        priority: 'urgent',
        stepKey: 'first_chat',
        order: 1,
      },
      // ── Signal 1: Email (the #1 value driver) ──
      {
        title: '📡 Connect your first signal: Email',
        description: 'Email is your primary signal source — where requests, action items, and communication live. Go to Settings → Integrations to connect your inbox.',
        priority: 'high',
        stepKey: 'connect_email',
        order: 2,
      },
      {
        title: '⚡ Triage your email signal',
        description: 'Go to the Inbox tab and hit the "Triage" button. Divi will review your recent emails, identify action items, and create kanban cards for what needs your attention.',
        priority: 'high',
        stepKey: 'triage_email',
        order: 3,
      },
      {
        title: 'Review what Divi found on your Board',
        description: 'After triage, check the Board tab. Divi created cards for action items from your emails. These cards flow to NOW, where you prioritize and tackle them.',
        priority: 'high',
        stepKey: 'review_board',
        order: 4,
      },
      // ── Signal 2: Calendar ──
      {
        title: '📡 Connect your second signal: Calendar',
        description: 'Your calendar is a rich signal — meeting prep, follow-ups, scheduling conflicts. Go to Settings → Integrations to connect.',
        priority: 'medium',
        stepKey: 'connect_calendar',
        order: 5,
      },
      {
        title: '⚡ Triage your calendar signal',
        description: 'Go to the Calendar tab and hit "Triage". Divi will identify meetings needing prep, flag conflicts, and create follow-up cards for past meetings.',
        priority: 'medium',
        stepKey: 'triage_calendar',
        order: 6,
      },
      // ── Signal capabilities ──
      {
        title: 'Configure email capabilities',
        description: 'Go to 📡 Signals tab → Capabilities and set up how Divi handles outbound email — send as you, as Divi, or context-aware. Define your rules.',
        priority: 'medium',
        stepKey: 'setup_email_capability',
        order: 7,
      },
      // ── Core features ──
      {
        title: 'Hit "Catch Up" to triage everything at once',
        description: 'The 🔄 Catch Up button in the top bar tells Divi to triage ALL your connected signals and give you a complete briefing. Try it after connecting your signals.',
        priority: 'medium',
        stepKey: 'catch_up',
        order: 8,
      },
      {
        title: 'Teach Divi a rule about how you work',
        description: 'Tell Divi something about your preferences in chat. Try: "I prefer to have meetings in the afternoon" or "Always check with me before sending emails to clients."',
        priority: 'medium',
        stepKey: 'teach_rule',
        order: 9,
      },
      {
        title: 'Set your first goal',
        description: 'Go to the Goals tab and create an objective you\'re working toward. Divi will track progress, nudge you, and help break it into actionable steps.',
        priority: 'low',
        stepKey: 'set_goal',
        order: 10,
      },
      {
        title: 'Explore the Agent Marketplace',
        description: 'Browse community-built agents that extend what Divi can do. Install one to give Divi new capabilities — it learns the agent\'s skills automatically.',
        priority: 'low',
        stepKey: 'explore_marketplace',
        order: 11,
      },
      {
        title: 'Invite a collaborator',
        description: 'Go to the Connections tab and invite someone you work with. Your agents will coordinate automatically — sharing context and routing tasks between you.',
        priority: 'low',
        stepKey: 'invite_collaborator',
        order: 12,
      },
    ];

    // ── Check which tasks already exist ────────────────────────────────────
    const existingTasks = await prisma.queueItem.findMany({
      where: { userId, projectId: project.id },
      select: { metadata: true },
    });
    const existingStepKeys = new Set(
      existingTasks
        .map((t: any) => {
          try { return JSON.parse(t.metadata || '{}').stepKey; } catch { return null; }
        })
        .filter(Boolean)
    );

    // ── Create tasks ──────────────────────────────────────────────────────
    const createdTasks = [];
    for (const task of ONBOARDING_TASKS) {
      if (existingStepKeys.has(task.stepKey)) continue;

      const item = await prisma.queueItem.create({
        data: {
          type: 'task',
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: 'ready',
          source: 'system',
          userId,
          projectId: project.id,
          metadata: JSON.stringify({
            onboarding: true,
            stepKey: task.stepKey,
            order: task.order,
            skippable: true,
          }),
        },
      });
      createdTasks.push(item);
    }

    // ── Mark onboarding complete (wizard dismissed) ───────────────────────
    await prisma.user.update({
      where: { id: userId },
      data: { hasCompletedOnboarding: true },
    });

    // ── If agent name was customized, save it as a memory item ────────────
    if (agentName && agentName !== 'Divi') {
      await prisma.memoryItem.upsert({
        where: { userId_key: { userId, key: 'agent_name' } },
        update: { value: agentName },
        create: {
          tier: 1,
          category: 'general',
          key: 'agent_name',
          value: agentName,
          approved: true,
          source: 'user',
          userId,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId: project.id,
        tasksCreated: createdTasks.length,
        totalTasks: ONBOARDING_TASKS.length,
      },
    });
  } catch (error: any) {
    console.error('POST /api/onboarding/init error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
