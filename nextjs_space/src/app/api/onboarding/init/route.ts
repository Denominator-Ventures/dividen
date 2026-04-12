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
      {
        title: 'Connect your email inbox',
        description: 'This is the #1 way to get value from Divi. Once connected, Divi reads your inbox, surfaces what matters, drafts responses, and can send on your behalf. Go to Settings → Integrations to connect.',
        priority: 'high',
        stepKey: 'connect_email',
        order: 2,
      },
      {
        title: 'Let Divi analyze your inbox',
        description: 'After connecting email, ask Divi to read through your recent messages and tell you what needs attention. Divi will prioritize what\'s important and suggest responses.',
        priority: 'high',
        stepKey: 'analyze_inbox',
        order: 3,
      },
      {
        title: 'Add your first contact to the CRM',
        description: 'Open the CRM tab and add someone you work with regularly. Divi will track your interactions and build context about the relationship over time.',
        priority: 'medium',
        stepKey: 'add_contact',
        order: 4,
      },
      {
        title: 'Set your first goal',
        description: 'Go to the Goals tab and create an objective you\'re working toward. Divi will track progress, nudge you, and help break it into actionable steps.',
        priority: 'medium',
        stepKey: 'set_goal',
        order: 5,
      },
      {
        title: 'Teach Divi a rule about how you work',
        description: 'Tell Divi something about your preferences in chat. Try: "I prefer to have meetings in the afternoon" or "Always check with me before sending emails to clients."',
        priority: 'medium',
        stepKey: 'teach_rule',
        order: 6,
      },
      {
        title: 'Connect your calendar',
        description: 'Link your calendar so Divi can see your schedule, suggest optimal work windows, and prep you before meetings. Go to Settings → Integrations.',
        priority: 'medium',
        stepKey: 'connect_calendar',
        order: 7,
      },
      {
        title: 'Explore the Agent Marketplace',
        description: 'Browse community-built agents that extend what Divi can do. Install one to give Divi new capabilities — it learns the agent\'s skills automatically.',
        priority: 'low',
        stepKey: 'explore_marketplace',
        order: 8,
      },
      {
        title: 'Invite a collaborator',
        description: 'Go to the Connections tab and invite someone you work with. Your agents will coordinate automatically — sharing context and routing tasks between you.',
        priority: 'low',
        stepKey: 'invite_collaborator',
        order: 9,
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
