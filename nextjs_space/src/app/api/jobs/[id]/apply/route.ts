export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/jobs/[id]/apply — Apply to a job / accept an agent match
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const job = await prisma.networkJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.status !== 'open') return NextResponse.json({ error: 'Job is no longer open' }, { status: 400 });
  if (job.posterId === userId) return NextResponse.json({ error: 'Cannot apply to your own job' }, { status: 400 });

  // Check for existing application
  const existing = await prisma.jobApplication.findUnique({
    where: { jobId_applicantId: { jobId: params.id, applicantId: userId } },
  });
  if (existing) return NextResponse.json({ error: 'Already applied' }, { status: 409 });

  let body: any = {};
  try { body = await req.json(); } catch {}

  const application = await prisma.jobApplication.create({
    data: {
      jobId: params.id,
      applicantId: userId,
      coverNote: body.coverNote || null,
      matchScore: body.matchScore || null,
      matchReason: body.matchReason || null,
      source: body.source || 'self_apply',
    },
  });

  return NextResponse.json({ application }, { status: 201 });
}
