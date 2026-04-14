export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/onboarding/setup-project
 * Creates the "DiviDen Setup" project with kanban task cards.
 * Body: { mode: 'together' | 'solo' }
 *   - together: tasks due today, Divi guides each step
 *   - solo: tasks due in 1 week, framed as "confirm done or need help?"
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const mode: 'together' | 'solo' = body.mode || 'together';

    // Check if setup project already exists
    const existing = await prisma.project.findFirst({
      where: {
        createdById: userId,
        metadata: { contains: '"isSetupProject":true' },
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        data: { projectId: existing.id, alreadyExists: true },
      });
    }

    const now = new Date();
    const oneWeek = new Date(now);
    oneWeek.setDate(oneWeek.getDate() + 7);
    const dueDate = mode === 'together' ? now : oneWeek;

    // Create the setup project
    const project = await prisma.project.create({
      data: {
        name: 'DiviDen Setup',
        description: mode === 'together'
          ? 'Let\'s get your command center configured — Divi will walk you through each step.'
          : 'Your setup checklist — complete at your own pace. Divi will check in if anything\'s outstanding.',
        status: 'active',
        visibility: 'private',
        color: '#6366f1', // Indigo — matches brand
        createdById: userId,
        metadata: JSON.stringify({ isSetupProject: true, setupMode: mode }),
        members: {
          create: { userId, role: 'lead' },
        },
      },
    });

    // Define the setup tasks
    const togetherTasks = [
      {
        title: 'Configure Divi\'s Working Style',
        description: 'Set how Divi communicates with you — verbosity, proactivity, autonomy, and formality levels. This shapes every interaction.',
        priority: 'high',
        status: 'active',
        order: 0,
      },
      {
        title: 'Set Triage Preferences',
        description: 'Choose how Divi should handle incoming signals — aggressive filtering, balanced, or let everything through.',
        priority: 'high',
        status: 'leads',
        order: 1,
      },
      {
        title: 'Connect Email & Calendar',
        description: 'Link your Google account so Divi can read your inbox, calendar, and files. This is how Divi sees your world.',
        priority: 'urgent',
        status: 'leads',
        order: 2,
      },
      {
        title: 'Review What\'s Connected',
        description: 'See what signals Divi can now read and what capabilities are active. Confirm everything looks right.',
        priority: 'medium',
        status: 'leads',
        order: 3,
      },
      {
        title: 'Set Up Custom Signals (Optional)',
        description: 'Add webhook endpoints or custom integrations for Slack, GitHub, CRM, or other tools you use daily.',
        priority: 'low',
        status: 'leads',
        order: 4,
      },
      {
        title: 'Run Your First Catch-Up',
        description: 'Let Divi scan all connected sources and build your initial priority stack. This is where the magic starts.',
        priority: 'high',
        status: 'leads',
        order: 5,
      },
    ];

    const soloTasks = [
      {
        title: 'Configure Divi\'s Working Style',
        description: 'Have you set Divi\'s communication preferences? Go to Settings or ask Divi in chat to adjust verbosity, proactivity, and autonomy.',
        priority: 'medium',
        status: 'leads',
        order: 0,
      },
      {
        title: 'Set Triage Preferences',
        description: 'Have you configured how Divi handles incoming signals? You can do this in Settings or ask Divi to walk you through it.',
        priority: 'medium',
        status: 'leads',
        order: 1,
      },
      {
        title: 'Connect Email & Calendar',
        description: 'Have you linked your Google account? Divi needs access to your inbox, calendar, and files to be useful. Check Settings → Connections.',
        priority: 'high',
        status: 'leads',
        order: 2,
      },
      {
        title: 'Review Connected Signals',
        description: 'Once connected, verify that Divi can see your email, calendar, and files. Ask Divi "what can you see?" to confirm.',
        priority: 'medium',
        status: 'leads',
        order: 3,
      },
      {
        title: 'Add Custom Signals (Optional)',
        description: 'If you use Slack, GitHub, or other tools, you can add webhook integrations. Ask Divi for help or check the docs.',
        priority: 'low',
        status: 'leads',
        order: 4,
      },
      {
        title: 'Run Your First Catch-Up',
        description: 'When you\'re ready, tell Divi "catch me up" and it will scan all connected sources to build your priority stack.',
        priority: 'medium',
        status: 'leads',
        order: 5,
      },
    ];

    const tasks = mode === 'together' ? togetherTasks : soloTasks;

    // Create kanban cards for each task
    const cards = await Promise.all(
      tasks.map((task) =>
        prisma.kanbanCard.create({
          data: {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assignee: 'human', // These are operator tasks — show in Now Panel
            dueDate,
            order: task.order,
            userId,
            projectId: project.id,
          },
        })
      )
    );

    // Mark onboarding as seen + in progress
    await prisma.user.update({
      where: { id: userId },
      data: {
        hasSeenWalkthrough: true,
        onboardingPhase: 6, // Skip old phase system — project handles it now
        hasCompletedOnboarding: false, // Will be set true when all cards are done
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId: project.id,
        projectName: project.name,
        cardCount: cards.length,
        mode,
      },
    });
  } catch (err: any) {
    console.error('Setup project creation error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create setup project' }, { status: 500 });
  }
}
