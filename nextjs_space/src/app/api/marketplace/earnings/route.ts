export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFeeInfo } from '@/lib/marketplace-config';

// GET /api/marketplace/earnings — Developer earnings dashboard
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const feeInfo = getFeeInfo();

    // Get user's Stripe Connect status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true, stripeConnectOnboarded: true },
    });
    const stripeConnect = {
      hasAccount: !!user?.stripeConnectAccountId,
      onboarded: !!user?.stripeConnectOnboarded,
    };

    // Get all agents the user has listed
    const myAgents = await prisma.marketplaceAgent.findMany({
      where: { developerId: userId },
      include: {
        _count: { select: { subscriptions: true, executions: true } },
      },
      orderBy: { totalExecutions: 'desc' },
    });

    if (myAgents.length === 0) {
      return NextResponse.json({ hasListings: false, agents: [], totals: null, feeInfo, stripeConnect });
    }

    const agentIds = myAgents.map((a: any) => a.id);

    // Get all executions for these agents
    const [totalExecs, completedExecs, failedExecs, recentExecs] = await Promise.all([
      prisma.marketplaceExecution.count({ where: { agentId: { in: agentIds } } }),
      prisma.marketplaceExecution.count({ where: { agentId: { in: agentIds }, status: 'completed' } }),
      prisma.marketplaceExecution.count({ where: { agentId: { in: agentIds }, status: 'failed' } }),
      prisma.marketplaceExecution.findMany({
        where: { agentId: { in: agentIds } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, agentId: true, taskInput: true, status: true,
          responseTimeMs: true, rating: true, createdAt: true,
          grossAmount: true, platformFee: true, developerPayout: true, feePercent: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    // Get active subscriptions
    const activeSubscriptions = await prisma.marketplaceSubscription.count({
      where: { agentId: { in: agentIds }, status: 'active' },
    });

    // Revenue from the real tracked fields on MarketplaceAgent
    const totalGrossRevenue = myAgents.reduce((sum: any, a: any) => sum + (a.totalGrossRevenue || 0), 0);
    const totalPlatformFees = myAgents.reduce((sum: any, a: any) => sum + (a.totalPlatformFees || 0), 0);
    const totalDeveloperPayout = myAgents.reduce((sum: any, a: any) => sum + (a.totalDeveloperPayout || 0), 0);
    const totalPendingPayout = myAgents.reduce((sum: any, a: any) => sum + (a.pendingPayout || 0), 0);

    // Also count subscription revenue (monthly recurring, not yet per-execution tracked)
    let subscriptionMRR = 0;
    for (const agent of myAgents) {
      if (agent.pricingModel === 'subscription' && agent.subscriptionPrice) {
        const activeSubs = await prisma.marketplaceSubscription.count({
          where: { agentId: agent.id, status: 'active' },
        });
        subscriptionMRR += activeSubs * agent.subscriptionPrice;
      }
    }

    // Per-agent breakdown with real revenue
    const agentBreakdown = myAgents.map((a: any) => {
      const { authToken, ...safeAgent } = a;
      return {
        ...safeAgent,
        grossRevenue: Math.round((a.totalGrossRevenue || 0) * 100) / 100,
        platformFees: Math.round((a.totalPlatformFees || 0) * 100) / 100,
        developerPayout: Math.round((a.totalDeveloperPayout || 0) * 100) / 100,
        pendingPayout: Math.round((a.pendingPayout || 0) * 100) / 100,
        // Keep estimatedRevenue for backward compat (now = developer payout)
        estimatedRevenue: Math.round((a.totalDeveloperPayout || 0) * 100) / 100,
      };
    });

    // Unique users
    const uniqueUsers = await prisma.marketplaceExecution.groupBy({
      by: ['userId'],
      where: { agentId: { in: agentIds } },
    });

    const paidAgents = myAgents.filter((a: any) => a.pricingModel !== 'free');

    return NextResponse.json({
      hasListings: true,
      hasPaidListings: paidAgents.length > 0,
      feeInfo,
      totals: {
        totalAgents: myAgents.length,
        paidAgents: paidAgents.length,
        totalExecutions: totalExecs,
        completedExecutions: completedExecs,
        failedExecutions: failedExecs,
        activeSubscriptions,
        uniqueUsers: uniqueUsers.length,
        // Revenue breakdown
        grossRevenue: Math.round(totalGrossRevenue * 100) / 100,
        platformFees: Math.round(totalPlatformFees * 100) / 100,
        developerPayout: Math.round(totalDeveloperPayout * 100) / 100,
        pendingPayout: Math.round(totalPendingPayout * 100) / 100,
        subscriptionMRR: Math.round(subscriptionMRR * 100) / 100,
        // Backward compat
        estimatedRevenue: Math.round(totalDeveloperPayout * 100) / 100,
      },
      agents: agentBreakdown,
      recentExecutions: recentExecs,
      stripeConnect,
    });
  } catch (error: any) {
    console.error('Marketplace earnings error:', error);
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 });
  }
}
