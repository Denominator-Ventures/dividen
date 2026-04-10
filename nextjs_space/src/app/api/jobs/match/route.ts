export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findMatchingJobsForUser, findMatchesForJob } from '@/lib/job-matcher';

/**
 * GET /api/jobs/match — Find matching jobs for current user
 * GET /api/jobs/match?jobId=xxx — Find matching users for a specific job
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (jobId) {
    // Find matching users for this job
    const matches = await findMatchesForJob(jobId);
    return NextResponse.json({ matches });
  } else {
    // Find matching jobs for this user
    const matches = await findMatchingJobsForUser(user.id);
    return NextResponse.json({ matches });
  }
}
