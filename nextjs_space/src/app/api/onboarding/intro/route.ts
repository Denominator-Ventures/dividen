export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/onboarding/intro
 * Creates project + card + checklist + chat messages in a single transaction.
 * Optimised for speed — everything runs in one DB round-trip.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Single parallel fetch: user info + existing intro check + existing project check
    const [user, existingIntro, existingProject] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, diviName: true } }),
      prisma.chatMessage.findFirst({
        where: { userId, role: 'assistant', metadata: { contains: '"isSetupIntro":true' } },
        select: { id: true },
      }),
      prisma.project.findFirst({
        where: { createdById: userId, metadata: { contains: '"isSetupProject":true' } },
        select: { id: true },
      }),
    ]);

    if (existingIntro) {
      return NextResponse.json({ success: true, data: { alreadyExists: true } });
    }

    const diviName = user?.diviName || 'Divi';
    const firstName = user?.name?.split(' ')[0] || 'there';
    const now = new Date();

    // Build all chat message data upfront
    const introContent = `Hey ${firstName} — I'm **${diviName}**, your AI chief of staff.

I read your signals — email, calendar, files, webhooks — and turn them into a prioritized stack of what matters. Tasks land on your board, organized and ready. You approve, adjust, or let me handle things autonomously.

Think of me as your operating layer. I don't just answer questions — I manage the flow of your work.

I've put a **DiviDen Setup** card on your board with 6 tasks to get everything configured. You can see them in your Now panel too.`;

    const choiceMetadata = JSON.stringify({
      isOnboarding: true, isSetupChoice: true, onboardingPhase: 0,
      widgets: [
        { type: 'radio', id: 'setupMode', label: '', options: [
          { value: 'together', label: '🤝 Walk me through it', description: "We'll go step by step together right now" },
          { value: 'solo', label: "🛠️ I'll explore on my own", description: "Tasks due in a week — I'll check in if anything's still open" },
        ], selectedValue: 'together' },
        { type: 'submit', id: 'setup_choice_submit', submitLabel: "Let's go →" },
      ],
    });

    const setupTasks = [
      "Configure Divi's Working Style",
      'Set Triage Preferences',
      'Connect Email & Calendar',
      "Review What's Connected",
      'Set Up Custom Signals (Optional)',
      'Run Your First Catch-Up',
    ];

    // ── Single transaction: project + card + checklist + messages + user update ──
    const result = await prisma.$transaction(async (tx) => {
      // Create or reuse project
      let projectId = existingProject?.id;
      if (!projectId) {
        const project = await tx.project.create({
          data: {
            name: 'DiviDen Setup',
            description: 'Get your command center configured — each step is a task.',
            status: 'active', visibility: 'private', color: '#6366f1',
            createdById: userId,
            metadata: JSON.stringify({ isSetupProject: true }),
            members: { create: { userId, role: 'lead' } },
          },
        });
        projectId = project.id;
      }

      // Create card (or find existing)
      let existingCard = await tx.kanbanCard.findFirst({
        where: { projectId, userId },
        select: { id: true },
      });

      let cardId: string;
      if (!existingCard) {
        const card = await tx.kanbanCard.create({
          data: {
            title: 'DiviDen Setup',
            description: 'Your onboarding checklist. Complete each task to get your command center fully configured.',
            status: 'active', priority: 'high', assignee: 'human',
            dueDate: now, order: 0, userId, projectId,
          },
        });
        cardId = card.id;

        // Batch-create checklist items
        await tx.checklistItem.createMany({
          data: setupTasks.map((text, i) => ({
            text, order: i, cardId, dueDate: now, assigneeType: 'self',
          })),
        });
      } else {
        cardId = existingCard.id;
      }

      // Create both chat messages + update user in parallel
      await Promise.all([
        tx.chatMessage.create({
          data: { role: 'assistant', content: introContent, userId, metadata: JSON.stringify({ isSetupIntro: true }) },
        }),
        tx.chatMessage.create({
          data: { role: 'assistant', content: 'How would you like to tackle the setup?', userId, metadata: choiceMetadata },
        }),
        tx.user.update({
          where: { id: userId },
          data: { hasSeenWalkthrough: true, onboardingPhase: 6 },
        }),
      ]);

      return { projectId, cardId };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('POST /api/onboarding/intro error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}