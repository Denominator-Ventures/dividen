export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';



export async function GET(req: NextRequest) {
  { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── User / Signup Stats ──
    const [totalUsers, usersLast7d, usersLast30d, allUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.findMany({
        select: {
          id: true, email: true, name: true, role: true, mode: true,
          createdAt: true, updatedAt: true,
          _count: {
            select: {
              chatMessages: true, kanbanCards: true, contacts: true,
              documents: true, recordings: true, calendarEvents: true,
              emailMessages: true, commsMessages: true, webhooks: true,
              externalApiKeys: true, connectionsRequested: true, connectionsAccepted: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // ── Content volume stats (batched) ──
    const [
      totalChatMessages, totalKanbanCards, totalContacts, totalDocuments,
      totalRecordings, totalCalendarEvents, totalEmails, totalCommsMessages,
      totalQueueItems, totalActivityLogs, totalWebhooks, totalWebhookLogs,
      totalMemoryItems, totalConnections, totalRelays, totalExternalApiKeys,
    ] = await Promise.all([
      prisma.chatMessage.count(), prisma.kanbanCard.count(), prisma.contact.count(), prisma.document.count(),
      prisma.recording.count(), prisma.calendarEvent.count(), prisma.emailMessage.count(), prisma.commsMessage.count(),
      prisma.queueItem.count(), prisma.activityLog.count(), prisma.webhook.count(), prisma.webhookLog.count(),
      prisma.memoryItem.count(), prisma.connection.count(), prisma.agentRelay.count(), prisma.externalApiKey.count(),
    ]);

    // ── Recent activity (last 7 days, batched) ──
    const [chatLast7d, cardsLast7d, contactsLast7d, docsLast7d, emailsLast7d, commsLast7d, activityLast7d, webhookLogsLast7d] = await Promise.all([
      prisma.chatMessage.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.kanbanCard.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.contact.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.document.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.emailMessage.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.commsMessage.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.activityLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.webhookLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    // ── Signup trend (daily for last 30 days) — single query with groupBy ──
    const signupTrend: { date: string; count: number }[] = [];
    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });
    const signupMap = new Map<string, number>();
    for (const u of recentUsers) {
      const day = u.createdAt.toISOString().split('T')[0];
      signupMap.set(day, (signupMap.get(day) || 0) + 1);
    }
    for (let i = 29; i >= 0; i--) {
      const dayStr = new Date(today.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      signupTrend.push({ date: dayStr, count: signupMap.get(dayStr) || 0 });
    }

    // ── Chat activity trend (daily for last 14 days) — single query ──
    const chatTrend: { date: string; count: number }[] = [];
    const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const recentChats = await prisma.chatMessage.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true },
    });
    const chatMap = new Map<string, number>();
    for (const c of recentChats) {
      const day = c.createdAt.toISOString().split('T')[0];
      chatMap.set(day, (chatMap.get(day) || 0) + 1);
    }
    for (let i = 13; i >= 0; i--) {
      const dayStr = new Date(today.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      chatTrend.push({ date: dayStr, count: chatMap.get(dayStr) || 0 });
    }

    // ── Kanban pipeline distribution ──
    const kanbanByStatus = await prisma.kanbanCard.groupBy({
      by: ['status'],
      _count: true,
    });

    // ── Webhook health ──
    const webhookErrorsLast7d = await prisma.webhookLog.count({
      where: { createdAt: { gte: sevenDaysAgo }, status: 'error' },
    });

    // ── Recent activity logs ──
    const recentActivity = await prisma.activityLog.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        actor: true,
        summary: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      users: {
        total: totalUsers,
        last7d: usersLast7d,
        last30d: usersLast30d,
        list: allUsers,
        signupTrend,
      },
      content: {
        chatMessages: totalChatMessages,
        kanbanCards: totalKanbanCards,
        contacts: totalContacts,
        documents: totalDocuments,
        recordings: totalRecordings,
        calendarEvents: totalCalendarEvents,
        emails: totalEmails,
        commsMessages: totalCommsMessages,
        queueItems: totalQueueItems,
        activityLogs: totalActivityLogs,
        memoryItems: totalMemoryItems,
        webhooks: totalWebhooks,
        webhookLogs: totalWebhookLogs,
        connections: totalConnections,
        relays: totalRelays,
        externalApiKeys: totalExternalApiKeys,
      },
      recent: {
        chatLast7d,
        cardsLast7d,
        contactsLast7d,
        docsLast7d,
        emailsLast7d,
        commsLast7d,
        activityLast7d,
        webhookLogsLast7d,
      },
      chatTrend,
      kanbanByStatus: kanbanByStatus.map((s: any) => ({
        status: s.status,
        count: s._count,
      })),
      webhookHealth: {
        totalLogs: totalWebhookLogs,
        errorsLast7d: webhookErrorsLast7d,
        successRate:
          totalWebhookLogs > 0
            ? ((totalWebhookLogs - webhookErrorsLast7d) / totalWebhookLogs * 100).toFixed(1)
            : '100.0',
      },
      recentActivity,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
