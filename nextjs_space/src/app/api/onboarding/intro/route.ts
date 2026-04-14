export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/onboarding/intro
 * Creates:
 *  1. A "DiviDen Setup" project
 *  2. One kanban card in 'active' column with 6 checklist tasks
 *  3. Divi's intro message + "together or solo?" choice widget in chat
 *
 * The setup card is a real card. The tasks are real checklist items with due dates
 * and assignees. They flow through the Now Panel like any other task.
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

    // ── Create project + card + checklist tasks ──
    const existingProject = await prisma.project.findFirst({
      where: {
        createdById: userId,
        metadata: { contains: '"isSetupProject":true' },
      },
    });

    let projectId = existingProject?.id;
    let cardId: string | undefined;

    if (!existingProject) {
      const now = new Date();

      // Create project
      const project = await prisma.project.create({
        data: {
          name: 'DiviDen Setup',
          description: 'Get your command center configured — each step is a task.',
          status: 'active',
          visibility: 'private',
          color: '#6366f1',
          createdById: userId,
          metadata: JSON.stringify({ isSetupProject: true }),
          members: { create: { userId, role: 'lead' } },
        },
      });
      projectId = project.id;

      // Create ONE card — the setup card
      const card = await prisma.kanbanCard.create({
        data: {
          title: 'DiviDen Setup',
          description: 'Your onboarding checklist. Complete each task to get your command center fully configured.',
          status: 'active', // Active column, not leads
          priority: 'high',
          assignee: 'human',
          dueDate: now,
          order: 0,
          userId,
          projectId: project.id,
        },
      });
      cardId = card.id;

      // Create checklist tasks on that card
      const setupTasks = [
        {
          text: "Configure Divi's Working Style",
          order: 0,
        },
        {
          text: 'Set Triage Preferences',
          order: 1,
        },
        {
          text: 'Connect Email & Calendar',
          order: 2,
        },
        {
          text: "Review What's Connected",
          order: 3,
        },
        {
          text: 'Set Up Custom Signals (Optional)',
          order: 4,
        },
        {
          text: 'Run Your First Catch-Up',
          order: 5,
        },
      ];

      await prisma.checklistItem.createMany({
        data: setupTasks.map((task) => ({
          text: task.text,
          order: task.order,
          cardId: card.id,
          dueDate: now, // Default: due now. Updated if user chooses "solo"
          assigneeType: 'self', // Assigned to the human operator
        })),
      });
    } else {
      // Project already exists — find the card
      const existingCard = await prisma.kanbanCard.findFirst({
        where: { projectId: existingProject.id, userId },
      });
      cardId = existingCard?.id;
    }

    // ── Create chat messages ──
    const introMessage = `Hey ${firstName} — I'm **${diviName}**, your AI chief of staff.

I read your signals — email, calendar, files, webhooks — and turn them into a prioritized stack of what matters. Tasks land on your board, organized and ready. You approve, adjust, or let me handle things autonomously.

Think of me as your operating layer. I don't just answer questions — I manage the flow of your work.

I've put a **DiviDen Setup** card on your board with 6 tasks to get everything configured. You can see them in your Now panel too.`;

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
                  label: "🛠️ I'll explore on my own",
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

    return NextResponse.json({ success: true, data: { projectId, cardId } });
  } catch (err: any) {
    console.error('POST /api/onboarding/intro error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}