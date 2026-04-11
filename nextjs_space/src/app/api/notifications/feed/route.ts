import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/feed — aggregated notification feed for the bell icon.
 * Returns recent activity items grouped by category, plus unread count.
 * Query: ?limit=20&since=<ISO date>
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
    const since = searchParams.get('since');

    const where: Record<string, unknown> = { userId };
    if (since) {
      where.createdAt = { gte: new Date(since) };
    }

    // Fetch recent activity
    const activities = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get user's last-seen timestamp
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { notificationsLastSeen: true } });
    const lastSeen = user?.notificationsLastSeen
      ? new Date(user.notificationsLastSeen)
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // default: 24h ago

    // Count unseen
    const unseenCount = await prisma.activityLog.count({
      where: { userId, createdAt: { gt: lastSeen } },
    });

    // Map to feed items
    const items = activities.map((a) => {
      let icon = '📋';
      let category = 'system';
      const action = a.action;
      if (action.startsWith('card_')) { icon = '🗂️'; category = 'board'; }
      else if (action.startsWith('queue_') || action === 'task_dispatched') { icon = '⚡'; category = 'queue'; }
      else if (action.startsWith('contact_')) { icon = '👤'; category = 'crm'; }
      else if (action.startsWith('event_')) { icon = '📅'; category = 'calendar'; }
      else if (action.startsWith('goal_')) { icon = '🎯'; category = 'goals'; }
      else if (action.startsWith('relay_') || action.startsWith('comms_')) { icon = '📡'; category = 'comms'; }
      else if (action.startsWith('connection_')) { icon = '🤝'; category = 'connections'; }
      else if (action.startsWith('document_') || action.startsWith('recording_')) { icon = '📄'; category = 'drive'; }
      else if (action.startsWith('marketplace_') || action.startsWith('agent_')) { icon = '🏪'; category = 'marketplace'; }
      else if (action.startsWith('federation_') || action.startsWith('pattern_')) { icon = '🌐'; category = 'federation'; }

      return {
        id: a.id,
        icon,
        category,
        action: a.action,
        actor: a.actor,
        summary: a.summary,
        time: a.createdAt.toISOString(),
        isNew: a.createdAt > lastSeen,
      };
    });

    return NextResponse.json({ success: true, data: { items, unseenCount } });
  } catch (error) {
    console.error('Notification feed error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch feed' }, { status: 500 });
  }
}

/**
 * POST /api/notifications/feed — mark notifications as seen
 * Body: { lastSeen: ISO string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const body = await req.json();

    await prisma.user.update({
      where: { id: userId },
      data: { notificationsLastSeen: new Date(body.lastSeen || new Date().toISOString()) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification mark-seen error:', error);
    return NextResponse.json({ success: false, error: 'Failed to mark seen' }, { status: 500 });
  }
}
