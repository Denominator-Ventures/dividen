export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  return token === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── User / Signup Stats (serialized to avoid pool exhaustion) ──
    const totalUsers = await prisma.user.count();
    const usersLast7d = await prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } });
    const usersLast30d = await prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
    const allUsers = await prisma.user.findMany({
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
    });

    // ── Content volume stats (serialized) ──
    const totalChatMessages = await prisma.chatMessage.count();
    const totalKanbanCards = await prisma.kanbanCard.count();
    const totalContacts = await prisma.contact.count();
    const totalDocuments = await prisma.document.count();
    const totalRecordings = await prisma.recording.count();
    const totalCalendarEvents = await prisma.calendarEvent.count();
    const totalEmails = await prisma.emailMessage.count();
    const totalCommsMessages = await prisma.commsMessage.count();
    const totalQueueItems = await prisma.queueItem.count();
    const totalActivityLogs = await prisma.activityLog.count();
    const totalWebhooks = await prisma.webhook.count();
    const totalWebhookLogs = await prisma.webhookLog.count();
    const totalMemoryItems = await prisma.memoryItem.count();
    const totalConnections = await prisma.connection.count();
    const totalRelays = await prisma.agentRelay.count();
    const totalExternalApiKeys = await prisma.externalApiKey.count();

    // ── Recent activity (last 7 days, serialized) ──
    const chatLast7d = await prisma.chatMessage.count({ where: { createdAt: { gte: sevenDaysAgo } } });
    const cardsLast7d = await prisma.kanbanCard.count({ where: { createdAt: { gte: sevenDaysAgo } } });
    const contactsLast7d = await prisma.contact.count({ where: { createdAt: { gte: sevenDaysAgo } } });
    const docsLast7d = await prisma.document.count({ where: { createdAt: { gte: sevenDaysAgo } } });
    const emailsLast7d = await prisma.emailMessage.count({ where: { createdAt: { gte: sevenDaysAgo } } });
    const commsLast7d = await prisma.commsMessage.count({ where: { createdAt: { gte: sevenDaysAgo } } });
    const activityLast7d = await prisma.activityLog.count({ where: { createdAt: { gte: sevenDaysAgo } } });
    const webhookLogsLast7d = await prisma.webhookLog.count({ where: { createdAt: { gte: sevenDaysAgo } } });

    // ── Signup trend (daily for last 30 days) ──
    const signupTrend: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = await prisma.user.count({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
      });
      signupTrend.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      });
    }

    // ── Chat activity trend (daily for last 14 days) ──
    const chatTrend: { date: string; count: number }[] = [];
    const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = await prisma.chatMessage.count({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
      });
      chatTrend.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      });
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
