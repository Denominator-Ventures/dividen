export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { withTelemetry } from '@/lib/telemetry';



async function _GET(req: NextRequest) {
  { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }

  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';
    const days = range === '7d' ? 7 : 30;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const since = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── Parallel batch fetch ──
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalChatMessages,
      usersWithCounts,
      recentChats,
      recentActivity,
      recentExecs,
      activeUsersRaw,
      promptEvents24h,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.chatMessage.count(),
      prisma.user.findMany({
        select: {
          id: true, email: true, name: true,
          _count: {
            select: {
              chatMessages: true, kanbanCards: true, contacts: true,
              documents: true, connectionsRequested: true, connectionsAccepted: true,
              recordings: true, calendarEvents: true, emailMessages: true,
              commsMessages: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      // Daily chat volume
      prisma.chatMessage.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      // Daily activity logs
      prisma.activityLog.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      // Marketplace executions
      prisma.marketplaceExecution.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      // Active users (had chat in last 7 days)
      prisma.chatMessage.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      // v2.4.7 Phase 1.3 — prompt token metering (last 24h)
      prisma.telemetryEvent.findMany({
        where: { type: 'prompt', createdAt: { gte: last24h } },
        select: { userId: true, duration: true, metadata: true },
      }),
    ]);

    // ── Daily trends ──
    function buildDailyTrend(items: { createdAt: Date }[]): { date: string; count: number }[] {
      const map = new Map<string, number>();
      for (const item of items) {
        const day = item.createdAt.toISOString().split('T')[0];
        map.set(day, (map.get(day) || 0) + 1);
      }
      const result: { date: string; count: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const dayStr = new Date(today.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        result.push({ date: dayStr, count: map.get(dayStr) || 0 });
      }
      return result;
    }

    // ── Feature adoption ──
    const featureAdoption: Record<string, { users: number; total: number; label: string }> = {
      chatMessages: { users: 0, total: 0, label: '💬 Chat' },
      kanbanCards: { users: 0, total: 0, label: '📋 Kanban' },
      contacts: { users: 0, total: 0, label: '👤 CRM' },
      documents: { users: 0, total: 0, label: '📄 Documents' },
      recordings: { users: 0, total: 0, label: '🎤 Recordings' },
      calendarEvents: { users: 0, total: 0, label: '📅 Calendar' },
      emailMessages: { users: 0, total: 0, label: '✉️ Email' },
      commsMessages: { users: 0, total: 0, label: '📡 Comms' },
      connectionsRequested: { users: 0, total: 0, label: '🤝 Connections' },
    };

    for (const u of usersWithCounts) {
      for (const [key, meta] of Object.entries(featureAdoption)) {
        const count = (u._count as any)[key] || 0;
        meta.total += count;
        if (count > 0) meta.users++;
      }
    }

    // ── Top users ──
    const topUsers = usersWithCounts
      .map((u) => {
        const c = u._count as any;
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          totalActions: (c.chatMessages || 0) + (c.kanbanCards || 0) + (c.contacts || 0) + (c.documents || 0) + (c.connectionsRequested || 0) + (c.connectionsAccepted || 0),
          chatMessages: c.chatMessages || 0,
          kanbanCards: c.kanbanCards || 0,
          contacts: c.contacts || 0,
          documents: c.documents || 0,
          connections: (c.connectionsRequested || 0) + (c.connectionsAccepted || 0),
        };
      })
      .sort((a, b) => b.totalActions - a.totalActions)
      .slice(0, 20);

    const avgMessagesPerUser = totalUsers > 0 ? totalChatMessages / totalUsers : 0;

    // ── Prompt token metering (last 24h) ──
    // TelemetryEvent rows with type='prompt' store totalTokens in `duration` and
    // { systemTokens, totalTokens, messageCount, provider, catchUpMode } in metadata.
    const userEmailById = new Map<string, { email: string; name: string | null }>();
    for (const u of usersWithCounts) userEmailById.set(u.id, { email: u.email, name: u.name });

    const perUserPrompt = new Map<string, { prompts: number; totalTokens: number; maxTokens: number }>();
    let totalPromptCount = 0;
    let totalTokenSum = 0;
    let systemTokenSum = 0;
    let systemTokenSamples = 0;
    for (const ev of promptEvents24h) {
      totalPromptCount++;
      const tokens = ev.duration || 0;
      totalTokenSum += tokens;
      try {
        const meta = ev.metadata ? JSON.parse(ev.metadata) : null;
        if (meta && typeof meta.systemTokens === 'number') {
          systemTokenSum += meta.systemTokens;
          systemTokenSamples++;
        }
      } catch { /* ignore malformed metadata */ }
      const uid = ev.userId || '(anon)';
      const cur = perUserPrompt.get(uid) || { prompts: 0, totalTokens: 0, maxTokens: 0 };
      cur.prompts++;
      cur.totalTokens += tokens;
      if (tokens > cur.maxTokens) cur.maxTokens = tokens;
      perUserPrompt.set(uid, cur);
    }

    const promptTopUsers = Array.from(perUserPrompt.entries())
      .map(([userId, v]) => ({
        userId,
        email: userEmailById.get(userId)?.email || (userId === '(anon)' ? '(unauthenticated)' : userId),
        name: userEmailById.get(userId)?.name ?? null,
        prompts: v.prompts,
        totalTokens: v.totalTokens,
        avgTokens: Math.round(v.totalTokens / v.prompts),
        maxTokens: v.maxTokens,
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 10);

    const promptMetrics = {
      windowHours: 24,
      totalPrompts: totalPromptCount,
      totalTokens: totalTokenSum,
      uniqueUsers: perUserPrompt.size,
      avgTokensPerPrompt: totalPromptCount > 0 ? Math.round(totalTokenSum / totalPromptCount) : 0,
      avgSystemTokensPerPrompt: systemTokenSamples > 0 ? Math.round(systemTokenSum / systemTokenSamples) : 0,
      avgTokensPerUser: perUserPrompt.size > 0 ? Math.round(totalTokenSum / perUserPrompt.size) : 0,
      topUsers: promptTopUsers,
    };

    return NextResponse.json({
      featureAdoption,
      topUsers,
      dailyChat: buildDailyTrend(recentChats),
      dailyActivity: buildDailyTrend(recentActivity),
      marketplaceExecs: buildDailyTrend(recentExecs),
      summary: {
        totalUsers,
        activeUsers7d: activeUsersRaw.length,
        totalChatMessages,
        avgMessagesPerUser: Math.round(avgMessagesPerUser * 10) / 10,
        totalMarketplaceExecs: recentExecs.length,
      },
      promptMetrics,
    });
  } catch (error) {
    console.error('Admin usage error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
