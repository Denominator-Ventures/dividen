import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/activity
 * Universal event log — every event from any user or their Divi,
 * both inside the platform and via the comms channel.
 *
 * Query params:
 *  - actor: 'user' | 'divi' | 'system'
 *  - category: 'queue' | 'board' | 'crm' | 'calendar' | 'goals' | 'comms' | 'connections' | 'drive'
 *  - limit: number (default 100, max 500)
 *  - cursor: ISO date string for cursor-based pagination
 */

const CATEGORY_ACTIONS: Record<string, string[]> = {
  queue: ['queue_added', 'queue_updated', 'queue_status_changed', 'queue_deleted', 'queue_dispatched', 'task_dispatched'],
  board: ['card_created', 'card_updated', 'card_moved', 'card_deleted'],
  crm: ['contact_added', 'contact_updated', 'contact_deleted'],
  calendar: ['event_created', 'event_updated', 'event_deleted'],
  goals: ['goal_created', 'goal_updated', 'goal_deleted'],
  comms: ['comms_replied', 'comms_created', 'relay_sent', 'relay_responded', 'relay_broadcast'],
  connections: ['connection_created', 'connection_accepted', 'connection_removed'],
  drive: ['document_created', 'recording_created', 'recording_processed'],
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const actor = searchParams.get('actor');
  const category = searchParams.get('category');
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

  const where: Record<string, unknown> = { userId };

  if (actor) where.actor = actor;
  if (category && CATEGORY_ACTIONS[category]) {
    where.action = { in: CATEGORY_ACTIONS[category] };
  }
  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  const activities = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const nextCursor = activities.length === limit ? activities[activities.length - 1].createdAt.toISOString() : null;

  return NextResponse.json({
    success: true,
    data: activities,
    pagination: { nextCursor, count: activities.length },
  });
}
