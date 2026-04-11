export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/marketplace/earnings — Developer earnings dashboard
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // Get all agents the user has listed
    const myAgents = await prisma.marketplaceAgent.findMany({
      where: { developerId: userId },
      include: {
        _count: { select: { subscriptions: true, executions: true } },
      },
      orderBy: { totalExecutions: 'desc' },
    });

    if (myAgents.length === 0) {
      return NextResponse.json({ hasListings: false, agents: [], totals: null });
    }

    const agentIds = myAgents.map(a => a.id);

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
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    // Get active subscriptions
    const activeSubscriptions = await prisma.marketplaceSubscription.count({
      where: { agentId: { in: agentIds }, status: 'active' },
    });

    // Calculate revenue estimates
    const paidAgents = myAgents.filter(a => a.pricingModel !== 'free');
    let estimatedRevenue = 0;
    for (const agent of paidAgents) {
      if (agent.pricingModel === 'per_task' && agent.pricePerTask) {
        const completedForAgent = await prisma.marketplaceExecution.count({
          where: { agentId: agent.id, status: 'completed' },
        });
        estimatedRevenue += completedForAgent * agent.pricePerTask;
      } else if (agent.pricingModel === 'subscription' && agent.subscriptionPrice) {
        const activeSubs = await prisma.marketplaceSubscription.count({
          where: { agentId: agent.id, status: 'active' },
        });
        estimatedRevenue += activeSubs * agent.subscriptionPrice;
      }
    }

    // Per-agent breakdown
    const agentBreakdown = myAgents.map(a => {
      const { authToken, ...safeAgent } = a;
      let agentRevenue = 0;
      if (a.pricingModel === 'per_task' && a.pricePerTask) {
        // Approximate from total completed
        const completedRatio = a.successRate ?? 1;
        agentRevenue = Math.round(a.totalExecutions * completedRatio * a.pricePerTask * 100) / 100;
      } else if (a.pricingModel === 'subscription' && a.subscriptionPrice) {
        agentRevenue = (a._count?.subscriptions || 0) * a.subscriptionPrice;
      }
      return {
        ...safeAgent,
        estimatedRevenue: agentRevenue,
      };
    });

    // Unique users
    const uniqueUsers = await prisma.marketplaceExecution.groupBy({
      by: ['userId'],
      where: { agentId: { in: agentIds } },
    });

    return NextResponse.json({
      hasListings: true,
      hasPaidListings: paidAgents.length > 0,
      totals: {
        totalAgents: myAgents.length,
        paidAgents: paidAgents.length,
        totalExecutions: totalExecs,
        completedExecutions: completedExecs,
        failedExecutions: failedExecs,
        activeSubscriptions,
        uniqueUsers: uniqueUsers.length,
        estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
      },
      agents: agentBreakdown,
      recentExecutions: recentExecs,
    });
  } catch (error: any) {
    console.error('Marketplace earnings error:', error);
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 });
  }
}
