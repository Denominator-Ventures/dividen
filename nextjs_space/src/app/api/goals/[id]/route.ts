export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/goals/:id
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const goal = await prisma.goal.findFirst({
      where: { id: params.id, userId },
      include: {
        subGoals: true,
        parentGoal: { select: { id: true, title: true } },
        project: { select: { id: true, name: true, color: true } },
        team: { select: { id: true, name: true, avatar: true } },
      },
    });
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: goal });
  } catch (err: any) {
    console.error('Goal GET error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

/**
 * PUT /api/goals/:id
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const existing = await prisma.goal.findFirst({ where: { id: params.id, userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.timeframe !== undefined) updates.timeframe = body.timeframe;
    if (body.deadline !== undefined) updates.deadline = body.deadline ? new Date(body.deadline) : null;
    if (body.impact !== undefined) updates.impact = body.impact;
    if (body.status !== undefined) updates.status = body.status;
    if (body.progress !== undefined) updates.progress = Math.min(100, Math.max(0, Number(body.progress)));
    if (body.parentGoalId !== undefined) updates.parentGoalId = body.parentGoalId || null;
    if (body.projectId !== undefined) updates.projectId = body.projectId || null;
    if (body.teamId !== undefined) updates.teamId = body.teamId || null;
    if (body.metadata !== undefined) updates.metadata = body.metadata ? JSON.stringify(body.metadata) : null;

    const goal = await prisma.goal.update({
      where: { id: params.id },
      data: updates,
      include: {
        subGoals: { select: { id: true, title: true, status: true, progress: true } },
        project: { select: { id: true, name: true, color: true } },
        team: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json({ success: true, data: goal });
  } catch (err: any) {
    console.error('Goal PUT error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/goals/:id
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const existing = await prisma.goal.findFirst({ where: { id: params.id, userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.goal.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Goal DELETE error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
