export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * DEP-013: Network Job Board
 * GET  /api/jobs — List/search jobs
 * POST /api/jobs — Create a new job posting
 */

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'open';
  const taskType = searchParams.get('taskType');
  const mine = searchParams.get('mine') === 'true';
  const assigned = searchParams.get('assigned') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  const where: any = {};
  
  if (mine) {
    where.posterId = userId;
  } else if (assigned) {
    where.assigneeId = userId;
  }
  
  if (status !== 'all') where.status = status;
  if (taskType) where.taskType = taskType;

  const jobs = await prisma.networkJob.findMany({
    where,
    orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
    take: limit,
    include: {
      poster: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      _count: { select: { applications: true } },
    },
  });

  // Sort by urgency priority
  const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  jobs.sort((a, b) => (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2));

  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, description, taskType, urgency, compensation, estimatedHours, deadline, requiredSkills, preferredSkills, visibility } = body;

  if (!title || !description) {
    return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
  }

  const job = await prisma.networkJob.create({
    data: {
      title,
      description,
      taskType: taskType || 'custom',
      urgency: urgency || 'medium',
      compensation: compensation || null,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
      deadline: deadline ? new Date(deadline) : null,
      requiredSkills: requiredSkills ? JSON.stringify(requiredSkills) : null,
      preferredSkills: preferredSkills ? JSON.stringify(preferredSkills) : null,
      visibility: visibility || 'network',
      posterId: userId,
    },
    include: {
      poster: { select: { id: true, name: true } },
    },
  });

  // Update poster's reputation (jobs posted count)
  await prisma.reputationScore.upsert({
    where: { userId: userId },
    create: { userId: userId, jobsPosted: 1 },
    update: { jobsPosted: { increment: 1 } },
  }).catch(() => {});

  return NextResponse.json({ job }, { status: 201 });
}
