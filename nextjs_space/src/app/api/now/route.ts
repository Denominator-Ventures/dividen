export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { scoreAndRankNow } from '@/lib/now-engine';

/**
 * GET /api/now
 * Returns dynamically scored + ranked items for the NOW panel.
 * Combines: queue items, upcoming deadlines, goal urgency, calendar gaps, relay responses.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Fetch all the raw data in parallel
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Serialize queries to avoid connection pool exhaustion (max 10 connections)
    const queueItems = await prisma.queueItem.findMany({
      where: { userId, status: { in: ['ready', 'in_progress', 'blocked'] } },
      orderBy: { createdAt: 'desc' },
    });
    const goals = await prisma.goal.findMany({
      where: { userId, status: 'active' },
      include: {
        subGoals: { select: { id: true, title: true, status: true, progress: true } },
        project: { select: { id: true, name: true } },
      },
    });
    const kanbanCards = await prisma.kanbanCard.findMany({
      where: { userId, status: { in: ['active', 'development', 'planning', 'leads', 'qualifying', 'proposal', 'negotiation'] } },
      select: { id: true, title: true, status: true, priority: true, dueDate: true, projectId: true },
    });
    const calendarEvents = await prisma.calendarEvent.findMany({
      where: { userId, startTime: { gte: now, lte: tomorrow } },
      orderBy: { startTime: 'asc' },
      select: { id: true, title: true, startTime: true, endTime: true },
    });
    const relays = await prisma.agentRelay.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
        status: { in: ['completed', 'pending'] },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: { id: true, type: true, subject: true, status: true, fromUserId: true, toUserId: true, updatedAt: true },
    });

    const ranked = scoreAndRankNow({
      queueItems,
      goals,
      kanbanCards,
      calendarEvents,
      relays,
      userId,
      now,
    });

    return NextResponse.json({ success: true, data: ranked });
  } catch (err: any) {
    console.error('NOW engine error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
