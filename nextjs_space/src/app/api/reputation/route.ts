export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recomputeReputation } from '@/lib/job-matcher';

/**
 * GET /api/reputation — Get current user's reputation (or ?userId=xxx for another user)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || user.id;

  // Ensure reputation exists
  let rep = await prisma.reputationScore.findUnique({ where: { userId } });
  if (!rep) {
    await recomputeReputation(userId);
    rep = await prisma.reputationScore.findUnique({ where: { userId } });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  // Get recent reviews
  const reviews = await prisma.jobReview.findMany({
    where: { revieweeId: userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return NextResponse.json({
    user: { id: targetUser?.id, name: targetUser?.name },
    reputation: rep || { score: 0, level: 'new', jobsCompleted: 0, jobsPosted: 0, avgRating: 0, totalRatings: 0, onTimeRate: 1, responseRate: 1 },
    reviews,
  });
}
