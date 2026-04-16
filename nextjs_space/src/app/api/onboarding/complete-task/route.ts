export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkAndAutoCompleteCard } from '@/lib/card-auto-complete';
import { getSetupTaskAction } from '@/lib/onboarding-project';

/**
 * POST /api/onboarding/complete-task
 * 
 * Marks a specific setup checklist task as complete by text match.
 * Used by the chat UI when tasks are completed outside the normal
 * settings widget flow (e.g., catch-up ran, custom signals set up).
 * 
 * Body: { taskText: string }
 * Returns: { success, nextTaskText?, nextTaskAction?, allTasksComplete }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json().catch(() => ({}));
    const { taskText } = body;
    if (!taskText) return NextResponse.json({ error: 'taskText is required' }, { status: 400 });

    // Find incomplete checklist items matching this text on setup cards
    const matchingTasks = await prisma.checklistItem.findMany({
      where: {
        completed: false,
        text: { contains: taskText },
        card: {
          userId,
          status: { in: ['active', 'in_progress', 'development'] },
          OR: [
            { title: { contains: 'Setup' } },
            { project: { metadata: { contains: '"isSetupProject":true' } } },
          ],
        },
      },
      select: { id: true, cardId: true },
    });

    if (matchingTasks.length === 0) {
      return NextResponse.json({ success: true, data: { found: false } });
    }

    // Mark them complete
    await prisma.checklistItem.updateMany({
      where: { id: { in: matchingTasks.map(t => t.id) } },
      data: { completed: true },
    });

    // Check if completing these tasks auto-completes any cards
    const cardIds = [...new Set(matchingTasks.map(t => t.cardId))];
    for (const cardId of cardIds) {
      await checkAndAutoCompleteCard(cardId, userId);
    }

    // Find the next incomplete task
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

    const nextTaskText = nextTask?.text || null;
    const nextTaskAction = nextTaskText ? getSetupTaskAction(nextTaskText) || null : null;
    const allTasksComplete = !nextTask;

    return NextResponse.json({
      success: true,
      data: { found: true, completed: matchingTasks.length, nextTaskText, nextTaskAction, allTasksComplete },
    });
  } catch (error: any) {
    console.error('POST /api/onboarding/complete-task error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
