export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * GET /api/profile/[userId]/relationship
 * 
 * The "Us" section — assembles the relationship context between
 * the current user and the target user. Only available when there's
 * an active connection.
 * 
 * Data sources:
 * - Connection (notes, tags, context, type, strength, firstMetAt)
 * - Shared teams (via TeamMember)
 * - Shared projects (via ProjectMember)
 * - Relay history (AgentRelay between the two)
 * - Job contracts (JobContract as client/worker)
 * - Agent usage (MarketplaceExecution)
 * - Email exchange count (EmailMessage)
 * - Shared calendar events (CalendarEvent with both in attendees)
 */
async function _GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = (session.user as any).id;
    const targetUserId = params.userId;

    if (currentUserId === targetUserId) {
      return NextResponse.json({ error: 'Cannot view relationship with yourself' }, { status: 400 });
    }

    // Find the active connection between these two users
    const connection = await prisma.connection.findFirst({
      where: {
        status: 'active',
        OR: [
          { requesterId: currentUserId, accepterId: targetUserId },
          { requesterId: targetUserId, accepterId: currentUserId },
        ],
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'No active connection' }, { status: 403 });
    }

    // Determine which side of the connection the current user is on
    const isRequester = connection.requesterId === currentUserId;

    // Parallel fetch all relationship data
    const [
      sharedTeams,
      sharedProjects,
      relayStats,
      recentRelays,
      jobContracts,
      agentUsageByCurrent,
      agentUsageByTarget,
      currentUserAgents,
      targetUserAgents,
    ] = await Promise.all([
      // Shared teams: both are members
      prisma.team.findMany({
        where: {
          isActive: true,
          AND: [
            { members: { some: { userId: currentUserId } } },
            { members: { some: { userId: targetUserId } } },
          ],
        },
        select: {
          id: true, name: true, type: true, avatar: true,
          _count: { select: { members: true } },
        },
        take: 10,
      }),

      // Shared projects: both are members
      prisma.project.findMany({
        where: {
          status: { not: 'archived' },
          AND: [
            { members: { some: { userId: currentUserId } } },
            { members: { some: { userId: targetUserId } } },
          ],
        },
        select: {
          id: true, name: true, status: true, color: true,
          _count: { select: { members: true, kanbanCards: true } },
        },
        take: 10,
      }),

      // Relay stats (count + topics)
      prisma.agentRelay.groupBy({
        by: ['type'],
        where: {
          connectionId: connection.id,
        },
        _count: true,
      }),

      // Recent relays (last 5)
      prisma.agentRelay.findMany({
        where: { connectionId: connection.id },
        select: {
          id: true, subject: true, type: true,
          status: true, createdAt: true, direction: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Job contracts between them
      prisma.jobContract.findMany({
        where: {
          OR: [
            { clientId: currentUserId, workerId: targetUserId },
            { clientId: targetUserId, workerId: currentUserId },
          ],
        },
        select: {
          id: true, status: true,
          compensationType: true, compensationAmount: true,
          clientId: true, workerId: true,
          createdAt: true,
          job: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Current user executed target's agents
      prisma.marketplaceExecution.findMany({
        where: {
          userId: currentUserId,
          agent: { developerId: targetUserId },
        },
        select: { id: true },
      }),

      // Target user executed current user's agents
      prisma.marketplaceExecution.findMany({
        where: {
          userId: targetUserId,
          agent: { developerId: currentUserId },
        },
        select: { id: true },
      }),

      // Current user's published agents (for context)
      prisma.marketplaceAgent.findMany({
        where: { developerId: currentUserId, status: 'active' },
        select: { id: true, name: true },
      }),

      // Target user's published agents
      prisma.marketplaceAgent.findMany({
        where: { developerId: targetUserId, status: 'active' },
        select: { id: true, name: true },
      }),
    ]);

    // Assemble relay stats
    const totalRelays = relayStats.reduce((sum: number, r: any) => sum + r._count, 0);

    // Connection context (the private annotations the current user has)
    const connectionContext = {
      notes: isRequester ? connection.notes : null, // notes are per-side
      tags: (() => { try { return JSON.parse(connection.connectionTags || '[]'); } catch { return []; } })(),
      context: connection.context,
      relationshipType: connection.relationshipType,
      firstMetAt: connection.firstMetAt?.toISOString() || null,
      strength: connection.strength,
      nickname: isRequester ? connection.nickname : connection.peerNickname,
      connectedSince: connection.createdAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      connectionContext,
      sharedTeams,
      sharedProjects,
      relays: {
        total: totalRelays,
        recent: recentRelays.map((r: any) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      },
      contracts: jobContracts.map((c: any) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        isCurrentUserClient: c.clientId === currentUserId,
      })),
      agentUsage: {
        youUsedTheirs: agentUsageByCurrent.length,
        theyUsedYours: agentUsageByTarget.length,
        yourAgents: currentUserAgents,
        theirAgents: targetUserAgents,
      },
    });
  } catch (error: any) {
    console.error('GET /api/profile/[userId]/relationship error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load relationship data' }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
