export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { withTelemetry } from '@/lib/telemetry';

/**
 * GET /api/goals
 * List goals for current user.
 * Query: ?status=active|completed|paused|abandoned  &timeframe=week|month|quarter|year  &projectId=xxx  &teamId=xxx
 */
async function _GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const timeframe = searchParams.get('timeframe');
    const projectId = searchParams.get('projectId');
    const teamId = searchParams.get('teamId');
    const parentGoalId = searchParams.get('parentGoalId');

    const where: any = { userId };
    if (status) where.status = status;
    if (timeframe) where.timeframe = timeframe;
    if (projectId) where.projectId = projectId;
    if (teamId) where.teamId = teamId;
    if (parentGoalId) where.parentGoalId = parentGoalId;
    if (parentGoalId === 'null') where.parentGoalId = null; // top-level goals only

    const goals = await prisma.goal.findMany({
      where,
      include: {
        subGoals: { select: { id: true, title: true, status: true, progress: true, impact: true } },
        project: { select: { id: true, name: true, color: true } },
        team: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: [{ impact: 'desc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return NextResponse.json({ success: true, data: goals });
  } catch (err: any) {
    console.error('Goals GET error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/goals
 * Create a new goal.
 */
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const { title, description, timeframe, deadline, impact, status, progress, parentGoalId, projectId, teamId, metadata } = body;

    if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const goal = await prisma.goal.create({
      data: {
        title: title.trim(),
        description: description || null,
        timeframe: timeframe || 'quarter',
        deadline: deadline ? new Date(deadline) : null,
        impact: impact || 'medium',
        status: status || 'active',
        progress: progress ?? 0,
        parentGoalId: parentGoalId || null,
        projectId: projectId || null,
        teamId: teamId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        userId,
      },
      include: {
        subGoals: { select: { id: true, title: true, status: true, progress: true } },
        project: { select: { id: true, name: true, color: true } },
        team: { select: { id: true, name: true, avatar: true } },
      },
    });

    logActivity({ userId, action: 'goal_created', summary: `Created goal "${goal.title}"`, metadata: { goalId: goal.id, impact: impact || 'medium', timeframe: timeframe || 'quarter' } });

    return NextResponse.json({ success: true, data: goal });
  } catch (err: any) {
    console.error('Goals POST error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
