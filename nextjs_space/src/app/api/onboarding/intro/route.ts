export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/onboarding/intro
 * Creates the DiviDen Setup project + kanban cards, then sends Divi's intro
 * message + "together or solo?" choice widget into chat.
 * Called after the user saves their API key in the OnboardingWelcome modal.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, diviName: true },
    });

    const diviName = user?.diviName || 'Divi';
    const firstName = user?.name?.split(' ')[0] || 'there';

    // Check if intro message already exists
    const existing = await prisma.chatMessage.findFirst({
      where: {
        userId,
        role: 'assistant',
        metadata: { contains: '"isSetupIntro":true' },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, data: { alreadyExists: true } });
    }

    // ── Create the DiviDen Setup project + cards immediately ──
    // The project exists on the board from the start. The choice widget
    // just determines due dates (now vs 1 week).
    const existingProject = await prisma.project.findFirst({
      where: {
        createdById: userId,
        metadata: { contains: '"isSetupProject":true' },
      },
    });

    let projectId = existingProject?.id;

    if (!existingProject) {
      const now = new Date();
      const project = await prisma.project.create({
        data: {
          name: 'DiviDen Setup',
          description: 'Get your command center configured — each step is a task on your board.',
          status: 'active',
          visibility: 'private',
          color: '#6366f1',
          createdById: userId,
          metadata: JSON.stringify({ isSetupProject: true }),
          members: {
            create: { userId, role: 'lead' },
          },
        },
      });
      projectId = project.id;

      // Create setup task cards — due dates will be updated when user makes their choice
      const setupTasks = [
        {
          title: "Configure Divi's Working Style",
          description: 'Set how Divi communicates with you — verbosity, proactivity, autonomy, and formality levels. This shapes every interaction.',
          priority: 'high',
          order: 0,
        },
        {
          title: 'Set Triage Preferences',
          description: 'Choose how Divi should handle incoming signals — aggressive filtering, balanced, or let everything through.',
          priority: 'high',
          order: 1,
        },
        {
          title: 'Connect Email & Calendar',
          description: 'Link your Google account so Divi can read your inbox, calendar, and files. This is how Divi sees your world.',
          priority: 'urgent',
          order: 2,
        },
        {
          title: "Review What's Connected",
          description: 'See what signals Divi can now read and what capabilities are active. Confirm everything looks right.',
          priority: 'medium',
          order: 3,
        },
        {
          title: 'Set Up Custom Signals (Optional)',
          description: 'Add webhook endpoints or custom integrations for Slack, GitHub, CRM, or other tools you use daily.',
          priority: 'low',
          order: 4,
        },
        {
          title: 'Run Your First Catch-Up',
          description: 'Let Divi scan all connected sources and build your initial priority stack. This is where the magic starts.',
          priority: 'high',
          order: 5,
        },
      ];

      await Promise.all(
        setupTasks.map((task) =>
          prisma.kanbanCard.create({
            data: {
              title: task.title,
              description: task.description,
              status: task.order === 0 ? 'active' : 'leads',
              priority: task.priority,
              assignee: 'human',
              dueDate: now, // Default to now — updated if user chooses "solo"
              order: task.order,
              userId,
              projectId: project.id,
            },
          })
        )
      );
    }

    // ── Create chat messages ──
    const introMessage = `Hey ${firstName} — I'm **${diviName}**, your AI chief of staff.

I read your signals — email, calendar, files, webhooks — and turn them into a prioritized stack of what matters. Tasks land on your board, organized and ready. You approve, adjust, or let me handle things autonomously.

Think of me as your operating layer. I don't just answer questions — I manage the flow of your work.

I've put a **DiviDen Setup** project on your board with ${6} tasks to get everything configured.`;

    const choiceMessage = `How would you like to tackle the setup?`;

    await prisma.chatMessage.create({
      data: {
        role: 'assistant',
        content: introMessage,
        userId,
        metadata: JSON.stringify({ isSetupIntro: true }),
      },
    });

    await prisma.chatMessage.create({
      data: {
        role: 'assistant',
        content: choiceMessage,
        userId,
        metadata: JSON.stringify({
          isOnboarding: true,
          isSetupChoice: true,
          onboardingPhase: 0,
          widgets: [
            {
              type: 'radio',
              id: 'setupMode',
              label: '',
              options: [
                {
                  value: 'together',
                  label: '🤝 Walk me through it',
                  description: "We'll go step by step together right now",
                },
                {
                  value: 'solo',
                  label: '🛠️ I\'ll explore on my own',
                  description: "Tasks due in a week — I'll check in if anything's still open",
                },
              ],
              selectedValue: 'together',
            },
            {
              type: 'submit',
              id: 'setup_choice_submit',
              submitLabel: "Let's go →",
            },
          ],
        }),
      },
    });

    // Mark walkthrough as seen, set phase to 6 (project-based onboarding)
    await prisma.user.update({
      where: { id: userId },
      data: {
        hasSeenWalkthrough: true,
        onboardingPhase: 6,
      },
    });

    return NextResponse.json({ success: true, data: { projectId } });
  } catch (err: any) {
    console.error('POST /api/onboarding/intro error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
