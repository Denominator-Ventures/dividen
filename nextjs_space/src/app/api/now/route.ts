export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { scoreAndRankNow } from '@/lib/now-engine';
import { logRequest, logError, getClientIp } from '@/lib/telemetry';

/**
 * GET /api/now
 * Returns dynamically scored + ranked items for the NOW panel.
 * Combines: queue items, upcoming deadlines, goal urgency, calendar gaps, relay responses.
 */
export async function GET(req: NextRequest) {
  const start = Date.now();
  const ip = getClientIp(req.headers);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Fetch all the raw data in parallel
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Parallel queries — 5 concurrent is fine within our pool limit
    // NOTE: Queue items are Divi's/agent domain — they belong in QueuePanel.
    // Now Panel only shows operator-facing items: kanban cards (assignee=human), goals, calendar, relays.
    const [goals, kanbanCards, calendarEvents, relays] = await Promise.all([
      prisma.goal.findMany({
        where: { userId, status: 'active' },
        include: {
          subGoals: { select: { id: true, title: true, status: true, progress: true } },
          project: { select: { id: true, name: true } },
        },
        take: 30,
      }),
      prisma.kanbanCard.findMany({
        where: {
          userId,
          assignee: 'human', // Only cards assigned to the operator — agent cards are Divi's domain
          status: { in: ['active', 'development', 'planning', 'leads', 'qualifying', 'proposal', 'negotiation'] },
        },
        select: { id: true, title: true, status: true, priority: true, dueDate: true, projectId: true },
        take: 50,
      }),
      prisma.calendarEvent.findMany({
        where: { userId, startTime: { gte: now, lte: tomorrow } },
        orderBy: { startTime: 'asc' },
        select: { id: true, title: true, startTime: true, endTime: true },
      }),
      prisma.agentRelay.findMany({
        where: {
          OR: [{ fromUserId: userId }, { toUserId: userId }],
          status: { in: ['completed', 'pending'] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { id: true, type: true, subject: true, status: true, fromUserId: true, toUserId: true, updatedAt: true },
      }),
    ]);

    const ranked = scoreAndRankNow({
      queueItems: [], // Queue items are Divi's domain — shown in Queue Panel only
      goals,
      kanbanCards,
      calendarEvents,
      relays,
      userId,
      now,
    });

    logRequest({ userId, ip, method: 'GET', path: '/api/now', statusCode: 200, duration: Date.now() - start });
    return NextResponse.json({ success: true, data: ranked });
  } catch (err: any) {
    console.error('NOW engine error:', err);
    logError({ ip, path: '/api/now', method: 'GET', errorMessage: err?.message || 'Unknown', errorStack: err?.stack });
    logRequest({ ip, method: 'GET', path: '/api/now', statusCode: 500, duration: Date.now() - start });
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
