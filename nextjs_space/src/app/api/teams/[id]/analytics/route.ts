export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/teams/:id/analytics — comprehensive team analytics
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Must be a team member (owner/admin for full view)
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId },
    });
    if (!membership) return NextResponse.json({ error: 'Not a team member' }, { status: 403 });

    const teamId = params.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── Parallel data fetching ──
    const [
      team,
      memberCount,
      projectCount,
      activeProjectCount,
      // Queue stats
      totalQueueItems,
      completedQueueItems,
      pendingQueueItems,
      blockedQueueItems,
      recentQueueItems,
      // Relay stats
      totalRelays,
      recentRelays,
      // Goal stats
      totalGoals,
      completedGoals,
      // Agent stats
      agentAccessCount,
      // Follower stats
      followerCount,
      // Invite stats
      pendingInvites,
      acceptedInvites,
      // Member details with activity
      members,
      // Projects with counts
      projects,
      // Spending policies
      spendingPolicies,
      // Queue items by status for chart
      queueByStatus,
      // Recent queue items for activity feed
      recentActivity,
    ] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId },
        select: {
          id: true, name: true, isSelfHosted: true, agentEnabled: true, createdAt: true,
          subscription: true, billing: true,
        },
      }),
      prisma.teamMember.count({ where: { teamId } }),
      prisma.project.count({ where: { teamId } }),
      prisma.project.count({ where: { teamId, status: { not: 'archived' } } }),
      // Queue
      prisma.queueItem.count({ where: { teamId } }),
      prisma.queueItem.count({ where: { teamId, status: 'done_today' } }),
      prisma.queueItem.count({ where: { teamId, status: { in: ['ready', 'pending_confirmation', 'in_progress'] } } }),
      prisma.queueItem.count({ where: { teamId, status: 'blocked' } }),
      prisma.queueItem.count({ where: { teamId, createdAt: { gte: sevenDaysAgo } } }),
      // Relays
      prisma.agentRelay.count({ where: { teamId } }),
      prisma.agentRelay.count({ where: { teamId, createdAt: { gte: sevenDaysAgo } } }),
      // Goals
      prisma.goal.count({ where: { teamId } }),
      prisma.goal.count({ where: { teamId, status: 'completed' } }),
      // Agent access
      prisma.teamAgentAccess.count({ where: { teamId, isActive: true } }),
      // Followers
      prisma.teamFollow.count({ where: { teamId } }),
      // Invites
      prisma.teamInvite.count({ where: { teamId, status: 'pending' } }),
      prisma.teamInvite.count({ where: { teamId, status: 'accepted' } }),
      // Members with user info
      prisma.teamMember.findMany({
        where: { teamId },
        include: {
          user: {
            select: {
              id: true, name: true, email: true,
              _count: {
                select: {
                  chatMessages: true,
                  kanbanCards: true,
                },
              },
            },
          },
          connection: {
            select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      }),
      // Projects with activity counts
      prisma.project.findMany({
        where: { teamId },
        select: {
          id: true, name: true, status: true, color: true, updatedAt: true,
          _count: { select: { kanbanCards: true, queueItems: true, members: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      // Spending policies
      prisma.teamSpendingPolicy.findMany({
        where: { teamId, isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
      // Queue grouped by status
      prisma.queueItem.groupBy({
        by: ['status'],
        where: { teamId },
        _count: true,
      }),
      // Recent activity feed (last 20 queue items)
      prisma.queueItem.findMany({
        where: { teamId },
        select: { id: true, title: true, status: true, priority: true, createdAt: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ]);

    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    // ── Compute member activity scores ──
    const memberActivity = members.map((m: any) => {
      const user = m.user;
      const conn = m.connection;
      return {
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        name: user?.name || conn?.peerUserName || 'Unknown',
        email: user?.email || conn?.peerUserEmail || null,
        isFederated: !user && !!conn,
        federatedInstance: conn?.peerInstanceUrl || null,
        activity: {
          chatMessages: user?._count?.chatMessages ?? 0,
          kanbanCards: user?._count?.kanbanCards ?? 0,
        },
      };
    });

    // ── Queue status distribution ──
    const statusDistribution: Record<string, number> = {};
    (queueByStatus as any[]).forEach((g: any) => {
      statusDistribution[g.status] = g._count;
    });

    // ── Compute completion rate ──
    const completionRate = totalQueueItems > 0
      ? Math.round((completedQueueItems / totalQueueItems) * 100)
      : 0;

    // ── Build billing summary ──
    const billingSummary = {
      subscription: team.subscription ? {
        tier: team.subscription.tier,
        status: team.subscription.status,
        memberLimit: team.subscription.memberLimit,
        monthlyPrice: team.subscription.monthlyPrice,
        perSeatPrice: team.subscription.perSeatPrice,
        trialEndsAt: team.subscription.trialEndsAt,
        canceledAt: team.subscription.canceledAt,
        billingCycleStart: team.subscription.billingCycleStart,
      } : null,
      billing: team.billing ? {
        monthlyBudget: team.billing.monthlyBudget,
        currentSpend: team.billing.currentSpend,
        billingCycleStart: team.billing.billingCycleStart,
        isActive: team.billing.isActive,
        budgetUtilization: team.billing.monthlyBudget
          ? Math.round((team.billing.currentSpend / team.billing.monthlyBudget) * 100)
          : null,
      } : null,
      spendingPolicies: spendingPolicies.map((p: any) => ({
        id: p.id,
        type: p.type,
        targetId: p.targetId,
        limit: p.limit,
        currentSpend: p.currentSpend,
        period: p.period,
        utilization: p.limit > 0 ? Math.round((p.currentSpend / p.limit) * 100) : 0,
      })),
      isSelfHosted: team.isSelfHosted,
    };

    return NextResponse.json({
      overview: {
        teamName: team.name,
        isSelfHosted: team.isSelfHosted,
        agentEnabled: team.agentEnabled,
        createdAt: team.createdAt,
        memberCount,
        projectCount,
        activeProjectCount,
        followerCount,
        agentAccessCount,
      },
      queue: {
        total: totalQueueItems,
        completed: completedQueueItems,
        pending: pendingQueueItems,
        blocked: blockedQueueItems,
        recentWeek: recentQueueItems,
        completionRate,
        statusDistribution,
      },
      relays: {
        total: totalRelays,
        recentWeek: recentRelays,
      },
      goals: {
        total: totalGoals,
        completed: completedGoals,
        completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
      },
      invites: {
        pending: pendingInvites,
        accepted: acceptedInvites,
      },
      members: memberActivity,
      projects,
      billing: billingSummary,
      recentActivity,
    });
  } catch (error: any) {
    console.error('GET /api/teams/:id/analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
