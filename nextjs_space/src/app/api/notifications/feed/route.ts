import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parsePrefs } from '@/lib/notification-prefs';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

/* ─── Category classification (same as before) ─── */
function classify(action: string): { icon: string; category: string } {
  if (action.startsWith('card_'))        return { icon: '\uD83D\uDDC2\uFE0F', category: 'board' };
  if (action.startsWith('queue_') || action === 'task_dispatched' || action === 'task_queued' || action === 'task_decomposed')
                                          return { icon: '\u26A1',  category: 'queue' };
  if (action.startsWith('contact_'))     return { icon: '\uD83D\uDC64', category: 'crm' };
  if (action.startsWith('event_'))       return { icon: '\uD83D\uDCC5', category: 'calendar' };
  if (action.startsWith('goal_'))        return { icon: '\uD83C\uDFAF', category: 'goals' };
  if (action.startsWith('relay_') || action.startsWith('comms_'))
                                          return { icon: '\uD83D\uDCE1', category: 'comms' };
  if (action.startsWith('connection_'))  return { icon: '\uD83E\uDD1D', category: 'connections' };
  if (action.startsWith('document_') || action.startsWith('recording_'))
                                          return { icon: '\uD83D\uDCC4', category: 'drive' };
  if (action.startsWith('marketplace_') || action.startsWith('agent_'))
                                          return { icon: '\uD83E\uDEE7', category: 'marketplace' };
  if (action.startsWith('federation_') || action.startsWith('pattern_'))
                                          return { icon: '\uD83C\uDF10', category: 'federation' };
  if (action.startsWith('team_'))        return { icon: '\uD83D\uDC65', category: 'teams' };
  if (action.startsWith('project_'))     return { icon: '\uD83D\uDCC1', category: 'projects' };
  if (action === 'learning_generated')   return { icon: '\uD83E\uDDE0', category: 'intelligence' };
  return { icon: '\uD83D\uDCCB', category: 'system' };
}

/* ─── Noise filter: actions that are internal plumbing, not user-pertinent ─── */
const NOISE_ACTIONS = new Set([
  'board_scan',                // periodic background scan
  'sync_completed',            // internal sync
  'setup_action',              // setup flow plumbing
  'queue_status_changed',      // too granular — we summarise dispatches / completions instead
]);

/* ─── High-signal actions that always show individually ─── */
const HIGH_SIGNAL_ACTIONS = new Set([
  'connection_accepted',
  'connection_created',
  'project_created',
  'task_dispatched',
  'relay_completed',
  'relay_declined',
  'card_auto_completed',
  'federation_relay_completed',
  'learning_generated',
  'marketplace_resubmission',
  'goal_completed',
  'google_connected',
]);

interface RawActivity {
  id: string;
  action: string;
  actor: string;
  summary: string;
  createdAt: Date;
  metadata: string | null;
}

interface FeedItem {
  id: string;
  icon: string;
  category: string;
  action: string;
  actor: string;
  summary: string;
  time: string;
  isNew: boolean;
  count?: number; // > 1 means this is a summary of N events
}

/**
 * Aggregate raw activities into summarised notifications.
 * Groups low-signal events by (action + time-window) into single entries like
 * "3 tasks queued for dispatch" instead of 3 separate items.
 */
function aggregateNotifications(activities: RawActivity[], lastSeen: Date): FeedItem[] {
  const results: FeedItem[] = [];
  const buckets = new Map<string, RawActivity[]>();

  for (const a of activities) {
    if (NOISE_ACTIONS.has(a.action)) continue;

    if (HIGH_SIGNAL_ACTIONS.has(a.action)) {
      const { icon, category } = classify(a.action);
      results.push({
        id: a.id,
        icon,
        category,
        action: a.action,
        actor: a.actor,
        summary: a.summary,
        time: a.createdAt.toISOString(),
        isNew: a.createdAt > lastSeen,
      });
      continue;
    }

    // Bucket by action + hour window for aggregation
    const hourKey = new Date(a.createdAt).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const bucketKey = `${a.action}::${hourKey}`;
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
    buckets.get(bucketKey)!.push(a);
  }

  // Collapse buckets
  for (const [key, items] of buckets) {
    const action = key.split('::')[0];
    const { icon, category } = classify(action);
    const latest = items[0]; // already desc sorted

    if (items.length === 1) {
      results.push({
        id: latest.id,
        icon,
        category,
        action,
        actor: latest.actor,
        summary: latest.summary,
        time: latest.createdAt.toISOString(),
        isNew: latest.createdAt > lastSeen,
      });
    } else {
      // Summarise
      const summary = buildSummary(action, items);
      results.push({
        id: latest.id,
        icon,
        category,
        action,
        actor: 'system',
        summary,
        time: latest.createdAt.toISOString(),
        isNew: items.some(i => i.createdAt > lastSeen),
        count: items.length,
      });
    }
  }

  // Sort by time desc
  results.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return results;
}

function buildSummary(action: string, items: RawActivity[]): string {
  const n = items.length;
  switch (action) {
    case 'task_queued':
      return `${n} tasks queued for dispatch`;
    case 'comms_message_sent':
      return `${n} comms messages sent`;
    case 'comms_message_received':
      return `${n} comms messages received`;
    case 'queue_added':
      return `${n} items added to your queue`;
    case 'queue_deleted':
      return `${n} items cleared from queue`;
    case 'card_created':
      return `${n} cards created on your board`;
    case 'card_moved':
      return `${n} cards moved on your board`;
    case 'card_updated':
      return `${n} cards updated`;
    case 'contact_created':
      return `${n} new contacts added to CRM`;
    case 'contact_updated':
      return `${n} contacts updated`;
    case 'event_created':
      return `${n} calendar events created`;
    case 'document_created':
      return `${n} documents uploaded`;
    case 'project_invite_sent':
      return `${n} project invitations sent`;
    case 'relay_sent':
      return `${n} relays sent`;
    case 'relay_received':
      return `${n} relays received`;
    default: {
      // Generic: use the action name humanised
      const label = action.replace(/_/g, ' ');
      return `${n} ${label} events`;
    }
  }
}

/**
 * GET /api/notifications/feed — aggregated, filtered notification feed.
 */
async function _GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    // Load user prefs
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationsLastSeen: true, notificationPrefs: true },
    });
    const prefs = parsePrefs(user?.notificationPrefs);
    const lastSeen = user?.notificationsLastSeen
      ? new Date(user.notificationsLastSeen)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    // If master toggle is off, return empty
    if (!prefs.enabled) {
      return NextResponse.json({ success: true, data: { items: [], unseenCount: 0 } });
    }

    // Fetch raw activities (more than limit since aggregation compresses)
    const activities = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit * 3, // fetch more to allow aggregation
    }) as RawActivity[];

    // Aggregate into summarised notifications
    let items = aggregateNotifications(activities, lastSeen);

    // Filter by category preferences
    const disabledCategories = Object.entries(prefs.categories)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (disabledCategories.length > 0) {
      items = items.filter(i => !disabledCategories.includes(i.category));
    }

    // Trim to limit
    items = items.slice(0, limit);

    // Count unseen (before category filter — we want accurate bell badge)
    const unseenCount = items.filter(i => i.isNew).length;

    return NextResponse.json({ success: true, data: { items, unseenCount } });
  } catch (error) {
    console.error('Notification feed error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch feed' }, { status: 500 });
  }
}

/**
 * POST /api/notifications/feed — mark notifications as seen
 */
async function _POST(req: NextRequest) {
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

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
