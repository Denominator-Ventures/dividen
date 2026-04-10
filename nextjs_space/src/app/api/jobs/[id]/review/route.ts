export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recomputeReputation } from '@/lib/job-matcher';

/**
 * POST /api/jobs/[id]/review — Leave a review after job completion
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const job = await prisma.networkJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.status !== 'completed') return NextResponse.json({ error: 'Can only review completed jobs' }, { status: 400 });

  const isPoster = job.posterId === user.id;
  const isAssignee = job.assigneeId === user.id;
  if (!isPoster && !isAssignee) return NextResponse.json({ error: 'Only poster or assignee can review' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { rating, comment } = body;
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
  }

  const revieweeId = isPoster ? job.assigneeId! : job.posterId;
  const type = isPoster ? 'poster_to_worker' : 'worker_to_poster';

  // Check for existing review
  const existing = await prisma.jobReview.findUnique({
    where: { jobId_reviewerId: { jobId: params.id, reviewerId: user.id } },
  });
  if (existing) return NextResponse.json({ error: 'Already reviewed' }, { status: 409 });

  const review = await prisma.jobReview.create({
    data: {
      jobId: params.id,
      reviewerId: user.id,
      revieweeId,
      rating,
      comment: comment || null,
      type,
    },
  });

  // Recompute reviewee reputation
  await recomputeReputation(revieweeId).catch(() => {});

  return NextResponse.json({ review }, { status: 201 });
}
