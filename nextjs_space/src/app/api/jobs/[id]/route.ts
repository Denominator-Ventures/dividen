export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * GET  /api/jobs/[id] — Get job detail
 * PATCH /api/jobs/[id] — Update job
 * DELETE /api/jobs/[id] — Cancel job
 */

async function _GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

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

async function _PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const job = await prisma.networkJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.posterId !== userId) return NextResponse.json({ error: 'Not your job posting' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const allowedFields = ['title', 'description', 'taskType', 'urgency', 'compensation', 'estimatedHours', 'deadline', 'requiredSkills', 'preferredSkills', 'visibility', 'status', 'assigneeId', 'compensationType', 'compensationAmount', 'compensationCurrency'];
  const data: any = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === 'requiredSkills' || field === 'preferredSkills') {
        data[field] = JSON.stringify(body[field]);
      } else if (field === 'deadline') {
        data[field] = body[field] ? new Date(body[field]) : null;
      } else if (field === 'estimatedHours' || field === 'compensationAmount') {
        data[field] = body[field] ? parseFloat(body[field]) : null;
      } else {
        data[field] = body[field];
      }
    }
  }

  // Recompute isPaid if compensation fields changed
  if (data.compensationType !== undefined || data.compensationAmount !== undefined) {
    const ct = data.compensationType ?? job.compensationType;
    const ca = data.compensationAmount ?? job.compensationAmount;
    data.isPaid = !!ct && ct !== 'volunteer' && !!ca && ca > 0;
  }

  const updated = await prisma.networkJob.update({ where: { id: params.id }, data });
  return NextResponse.json({ job: updated });
}

async function _DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const job = await prisma.networkJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.posterId !== userId) return NextResponse.json({ error: 'Not your job posting' }, { status: 403 });

  await prisma.networkJob.update({ where: { id: params.id }, data: { status: 'cancelled' } });
  return NextResponse.json({ success: true });
}

export const GET = withTelemetry(_GET);
export const PATCH = withTelemetry(_PATCH);
export const DELETE = withTelemetry(_DELETE);
