export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recomputeReputation } from '@/lib/job-matcher';

/**
 * POST /api/jobs/[id]/complete — Mark job as completed
 * Can be called by poster (to confirm completion) or assignee (to submit completion)
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const job = await prisma.networkJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.status !== 'in_progress') return NextResponse.json({ error: 'Job must be in_progress to complete' }, { status: 400 });
  
  const isParty = job.posterId === userId || job.assigneeId === userId;
  if (!isParty) return NextResponse.json({ error: 'Only poster or assignee can complete' }, { status: 403 });

  let body: any = {};
  try { body = await req.json(); } catch {}

  await prisma.networkJob.update({
    where: { id: params.id },
    data: { status: 'completed', completionNote: body.completionNote || null },
  });

  // Recompute reputation for both parties
  if (job.assigneeId) await recomputeReputation(job.assigneeId).catch(() => {});
  await recomputeReputation(job.posterId).catch(() => {});

  return NextResponse.json({ success: true, message: 'Task marked as completed. Leave a review to build reputation.' });
}
