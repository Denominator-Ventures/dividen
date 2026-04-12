export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const userId = (session!.user as any).id as string;

    // Check if user should see earnings widget:
    // 1. Has marketplace agents listed, OR
    // 2. Has a profile with availableForHire / posted jobs / applied to jobs
    const [marketplaceAgentCount, postedJobCount, appliedJobCount] = await Promise.all([
      prisma.marketplaceAgent.count({ where: { developerId: userId, status: 'active' } }),
      prisma.networkJob.count({ where: { posterId: userId } }),
      prisma.jobApplication.count({ where: { applicantId: userId } }),
    ]);

    const visible = marketplaceAgentCount > 0 || postedJobCount > 0 || appliedJobCount > 0;

    if (!visible) {
      return NextResponse.json({ success: true, data: { jobEarnings: 0, agentEarnings: 0, visible: false } });
    }

    // Get actual earnings
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const [jobPayments, agentExecutions] = await Promise.all([
      // Job earnings (worker payouts)
      prisma.jobPayment.findMany({
        where: {
          contract: { workerId: userId },
          stripePaymentStatus: 'succeeded',
          createdAt: { gte: ninetyDaysAgo },
        },
        select: { workerPayout: true },
      }),
      // Agent marketplace earnings (developer payouts)
      prisma.marketplaceExecution.findMany({
        where: {
          agent: { developerId: userId },
          status: 'completed',
          createdAt: { gte: ninetyDaysAgo },
        },
        select: { developerPayout: true },
      }),
    ]);

    const jobEarnings = jobPayments.reduce((sum, p) => sum + (p.workerPayout || 0), 0);
    const agentEarnings = agentExecutions.reduce((sum, e) => sum + (e.developerPayout || 0), 0);

    return NextResponse.json({
      success: true,
      data: { jobEarnings, agentEarnings, visible: true },
    });
  } catch (error) {
    console.error('Earnings summary error:', error);
    return NextResponse.json({ success: true, data: { jobEarnings: 0, agentEarnings: 0, visible: false } });
  }
}
