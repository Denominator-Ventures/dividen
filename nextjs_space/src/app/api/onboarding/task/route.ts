export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/onboarding/task
 * Mark an onboarding task as completed or skipped.
 * Body: { taskId: string, action: 'complete' | 'skip' }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const { taskId, action } = body;

    if (!taskId || !['complete', 'skip'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify the task belongs to this user
    const task = await prisma.queueItem.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update status based on action
    const newStatus = action === 'complete' ? 'done_today' : 'done_today';
    const metadata = task.metadata ? JSON.parse(task.metadata) : {};
    metadata.onboardingAction = action; // Track whether it was completed or skipped
    metadata.actionAt = new Date().toISOString();

    await prisma.queueItem.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        metadata: JSON.stringify(metadata),
      },
    });

    // Check if all onboarding tasks are now done/skipped
    const remainingTasks = await prisma.queueItem.count({
      where: {
        userId,
        status: { in: ['ready', 'in_progress', 'blocked'] },
        metadata: { contains: '"onboarding":true' },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        taskId,
        action,
        remainingOnboardingTasks: remainingTasks,
        allComplete: remainingTasks === 0,
      },
    });
  } catch (error: any) {
    console.error('PATCH /api/onboarding/task error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/onboarding/task
 * Get onboarding task status for the current user.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const tasks = await prisma.queueItem.findMany({
      where: {
        userId,
        metadata: { contains: '"onboarding":true' },
      },
      orderBy: { createdAt: 'asc' },
    });

    const parsed = tasks.map((t: any) => {
      let meta: any = {};
      try { meta = JSON.parse(t.metadata || '{}'); } catch {}
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        stepKey: meta.stepKey,
        order: meta.order || 99,
        skippable: meta.skippable !== false,
        onboardingAction: meta.onboardingAction || null,
      };
    });

    parsed.sort((a: any, b: any) => a.order - b.order);

    return NextResponse.json({
      success: true,
      data: {
        tasks: parsed,
        remaining: parsed.filter((t: any) => ['ready', 'in_progress', 'blocked'].includes(t.status)).length,
        total: parsed.length,
      },
    });
  } catch (error: any) {
    console.error('GET /api/onboarding/task error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
