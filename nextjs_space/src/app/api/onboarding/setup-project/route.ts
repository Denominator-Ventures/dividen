export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/onboarding/setup-project
 * Updates setup card checklist due dates based on mode choice.
 * Body: { mode: 'together' | 'solo' }
 *   - together: tasks due today (card stays due today)
 *   - solo: tasks due in 1 week
 * 
 * Returns the first checklist task info so the client can auto-discuss it.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const mode: 'together' | 'solo' = body.mode || 'together';

    // Find the setup project
    const project = await prisma.project.findFirst({
      where: {
        createdById: userId,
        metadata: { contains: '"isSetupProject":true' },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Setup project not found' }, { status: 404 });
    }

    // Find the setup card
    const card = await prisma.kanbanCard.findFirst({
      where: { projectId: project.id, userId },
      include: {
        checklist: { orderBy: { order: 'asc' } },
      },
    });

    if (!card) {
      return NextResponse.json({ error: 'Setup card not found' }, { status: 404 });
    }

    const now = new Date();
    const oneWeek = new Date(now);
    oneWeek.setDate(oneWeek.getDate() + 7);
    const dueDate = mode === 'together' ? now : oneWeek;

    // Update card due date + all checklist item due dates
    await Promise.all([
      prisma.kanbanCard.update({
        where: { id: card.id },
        data: { dueDate },
      }),
      prisma.checklistItem.updateMany({
        where: { cardId: card.id },
        data: { dueDate },
      }),
    ]);

    // Store the mode choice in project metadata
    await prisma.project.update({
      where: { id: project.id },
      data: {
        metadata: JSON.stringify({ isSetupProject: true, setupMode: mode }),
      },
    });

    // Return the first incomplete task with its action config for direct widget triggering
    const firstTask = card.checklist.find((t: any) => !t.completed);
    let firstTaskAction = null;
    if (firstTask) {
      const { getSetupTaskAction } = await import('@/lib/onboarding-project');
      firstTaskAction = getSetupTaskAction(firstTask.text) || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId: project.id,
        cardId: card.id,
        mode,
        dueDate,
        firstTask: firstTask ? { id: firstTask.id, text: firstTask.text, action: firstTaskAction } : null,
      },
    });
  } catch (err: any) {
    console.error('Setup project update error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update setup project' }, { status: 500 });
  }
}