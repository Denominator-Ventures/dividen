export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET  /api/jobs/[id] — Get job detail
 * PATCH /api/jobs/[id] — Update job
 * DELETE /api/jobs/[id] — Cancel job
 */

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const job = await prisma.networkJob.findUnique({
    where: { id: params.id },
    include: {
      poster: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      applications: {
        include: { applicant: { select: { id: true, name: true, email: true } } },
        orderBy: { matchScore: 'desc' },
      },
    },
  });

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  return NextResponse.json({ job });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const job = await prisma.networkJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.posterId !== user.id) return NextResponse.json({ error: 'Not your job posting' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const allowedFields = ['title', 'description', 'taskType', 'urgency', 'compensation', 'estimatedHours', 'deadline', 'requiredSkills', 'preferredSkills', 'visibility', 'status', 'assigneeId'];
  const data: any = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === 'requiredSkills' || field === 'preferredSkills') {
        data[field] = JSON.stringify(body[field]);
      } else if (field === 'deadline') {
        data[field] = body[field] ? new Date(body[field]) : null;
      } else if (field === 'estimatedHours') {
        data[field] = body[field] ? parseFloat(body[field]) : null;
      } else {
        data[field] = body[field];
      }
    }
  }

  const updated = await prisma.networkJob.update({ where: { id: params.id }, data });
  return NextResponse.json({ job: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const job = await prisma.networkJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.posterId !== user.id) return NextResponse.json({ error: 'Not your job posting' }, { status: 403 });

  await prisma.networkJob.update({ where: { id: params.id }, data: { status: 'cancelled' } });
  return NextResponse.json({ success: true });
}
