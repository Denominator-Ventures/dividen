export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * GET /api/admin/federation-activity
 * 
 * Returns live federation & API activity data for the admin dashboard:
 * - API key usage across all users
 * - Connection inventory (local vs federated, trust levels)
 * - Relay traffic breakdown (direction, intent, status)
 * - Queue items created via external sources (api, webhook, federation)
 * - Recent federation events timeline
 */
export async function GET(req: NextRequest) {
  { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ── 1. API Keys ──────────────────────────────────────────────────────────
  const apiKeys = await prisma.externalApiKey.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { lastUsedAt: 'desc' },
  });

  const apiKeysSummary = {
    total: apiKeys.length,
    active: apiKeys.filter((k: any) => k.isActive).length,
    totalUsage: apiKeys.reduce((sum: any, k: any) => sum + k.usageCount, 0),
    usedLast7d: apiKeys.filter((k: any) => k.lastUsedAt && k.lastUsedAt > sevenDaysAgo).length,
    keys: apiKeys.map((k: any) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      permissions: k.permissions,
      isActive: k.isActive,
      usageCount: k.usageCount,
      lastUsedAt: k.lastUsedAt?.toISOString() || null,
      createdAt: k.createdAt.toISOString(),
      expiresAt: k.expiresAt?.toISOString() || null,
      user: k.user ? { name: k.user.name, email: k.user.email } : null,
    })),
  };

  // ── 2. Connections ───────────────────────────────────────────────────────
  const connections = await prisma.connection.findMany({
    include: {
      requester: { select: { name: true, email: true } },
      accepter: { select: { name: true, email: true } },
      _count: { select: { relays: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const connectionsSummary = {
    total: connections.length,
    active: connections.filter((c: any) => c.status === 'active').length,
    pending: connections.filter((c: any) => c.status === 'pending').length,
    federated: connections.filter((c: any) => c.isFederated).length,
    local: connections.filter((c: any) => !c.isFederated).length,
    connections: connections.map((c: any) => {
      let permissions: any = {};
      try { permissions = JSON.parse(c.permissions); } catch { /* ignore */ }
      return {
        id: c.id,
        status: c.status,
        isFederated: c.isFederated,
        peerInstanceUrl: c.peerInstanceUrl,
        peerUserName: c.peerUserName,
        peerUserEmail: c.peerUserEmail,
        trustLevel: permissions.trustLevel || 'unknown',
        scopes: permissions.scopes || [],
        relayCount: c._count.relays,
        requester: c.requester ? { name: c.requester.name, email: c.requester.email } : null,
        accepter: c.accepter ? { name: c.accepter.name, email: c.accepter.email } : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    }),
  };

  // ── 3. Relay Traffic ─────────────────────────────────────────────────────
  const relays = await prisma.agentRelay.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      fromUser: { select: { name: true, email: true } },
      toUser: { select: { name: true, email: true } },
      connection: { select: { isFederated: true, peerInstanceUrl: true, peerUserName: true } },
    },
  });

  const allRelays = await prisma.agentRelay.findMany({
    select: { direction: true, intent: true, status: true, createdAt: true, peerInstanceUrl: true },
  });

  // Breakdowns
  const byDirection: Record<string, number> = {};
  const byIntent: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let federatedCount = 0;
  let last7dCount = 0;

  for (const r of allRelays) {
    byDirection[r.direction] = (byDirection[r.direction] || 0) + 1;
    byIntent[r.intent] = (byIntent[r.intent] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.peerInstanceUrl) federatedCount++;
    if (r.createdAt > sevenDaysAgo) last7dCount++;
  }

  const relaySummary = {
    total: allRelays.length,
    last7d: last7dCount,
    federated: federatedCount,
    byDirection,
    byIntent,
    byStatus,
    recent: relays.map((r: any) => ({
      id: r.id,
      direction: r.direction,
      type: r.type,
      intent: r.intent,
      subject: r.subject,
      status: r.status,
      priority: r.priority,
      isFederated: !!r.peerInstanceUrl,
      peerInstanceUrl: r.peerInstanceUrl,
      from: r.fromUser ? { name: r.fromUser.name, email: r.fromUser.email } : null,
      to: r.toUser ? { name: r.toUser.name, email: r.toUser.email } : null,
      connectionPeer: r.connection?.peerUserName || null,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() || null,
    })),
  };

  // ── 4. External Queue Items ──────────────────────────────────────────────
  const externalQueueItems = await prisma.queueItem.findMany({
    where: { source: { in: ['api', 'webhook', 'federation'] } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const externalQueueCounts = await prisma.queueItem.groupBy({
    by: ['source'],
    where: { source: { in: ['api', 'webhook', 'federation'] } },
    _count: true,
  });

  const recentExternalCount = await prisma.queueItem.count({
    where: {
      source: { in: ['api', 'webhook', 'federation'] },
      createdAt: { gt: sevenDaysAgo },
    },
  });

  const queueSummary = {
    totalExternal: externalQueueCounts.reduce((sum: any, g: any) => sum + g._count, 0),
    last7d: recentExternalCount,
    bySource: Object.fromEntries(externalQueueCounts.map((g: any) => [g.source, g._count])),
    recent: externalQueueItems.map((q: any) => ({
      id: q.id,
      type: q.type,
      title: q.title,
      status: q.status,
      priority: q.priority,
      source: q.source,
      userId: q.userId,
      createdAt: q.createdAt.toISOString(),
    })),
  };

  // ── 5. Federation Config ─────────────────────────────────────────────────
  const fedConfig = await prisma.federationConfig.findFirst();

  return NextResponse.json({
    generatedAt: now.toISOString(),
    apiKeys: apiKeysSummary,
    connections: connectionsSummary,
    relays: relaySummary,
    externalQueue: queueSummary,
    federation: fedConfig ? {
      instanceName: fedConfig.instanceName,
      instanceUrl: fedConfig.instanceUrl,
      mode: fedConfig.federationMode,
      allowInbound: fedConfig.allowInbound,
      allowOutbound: fedConfig.allowOutbound,
      requireApproval: fedConfig.requireApproval,
    } : null,
  });
}
