import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ActiveBanner {
  id: string;
  ruleId: string;
  name: string;
  message: string;
  style: string;
  sound: boolean;
  eventType: string;
}

/**
 * GET /api/notifications/check — evaluate all enabled rules and return
 * an array of banners that should currently be displayed.
 *
 * Called by the dashboard on a polling interval (e.g. every 30s).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;

    const rules = await prisma.notificationRule.findMany({
      where: { userId, enabled: true },
    });

    const banners: ActiveBanner[] = [];
    const now = new Date();

    for (const rule of rules) {
      const conditions = rule.conditions ? JSON.parse(rule.conditions) : {};

      switch (rule.eventType) {
        // ── Meeting Starting ────────────────────────────────
        case 'meeting_starting': {
          const minutesBefore = conditions.minutesBefore ?? 5;
          const windowStart = new Date(now.getTime());
          const windowEnd = new Date(now.getTime() + minutesBefore * 60 * 1000);

          const upcomingEvents = await prisma.calendarEvent.findMany({
            where: {
              userId,
              startTime: { gte: windowStart, lte: windowEnd },
            },
            take: 3,
          });

          for (const evt of upcomingEvents) {
            const minsLeft = Math.max(0, Math.round((evt.startTime.getTime() - now.getTime()) / 60000));
            const msg = rule.message
              .replace('{{title}}', evt.title)
              .replace('{{minutes}}', String(minsLeft))
              .replace('{{time}}', evt.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            banners.push({
              id: `${rule.id}-${evt.id}`,
              ruleId: rule.id,
              name: rule.name,
              message: msg,
              style: rule.style,
              sound: rule.sound,
              eventType: rule.eventType,
            });
          }
          break;
        }

        // ── Task Overdue ────────────────────────────────────
        case 'task_overdue': {
          const overdueItems = await prisma.queueItem.findMany({
            where: {
              status: 'ready',
              createdAt: { lt: new Date(now.getTime() - (conditions.hoursOverdue ?? 24) * 3600000) },
            },
            take: 3,
          });
          for (const item of overdueItems) {
            const msg = rule.message
              .replace('{{title}}', item.title)
              .replace('{{hours}}', String(Math.round((now.getTime() - item.createdAt.getTime()) / 3600000)));
            banners.push({
              id: `${rule.id}-${item.id}`,
              ruleId: rule.id,
              name: rule.name,
              message: msg,
              style: rule.style,
              sound: rule.sound,
              eventType: rule.eventType,
            });
          }
          break;
        }

        // ── Email Received ──────────────────────────────────
        case 'email_received': {
          const recentEmails = await prisma.emailMessage.findMany({
            where: {
              userId,
              isRead: false,
              receivedAt: { gte: new Date(now.getTime() - 5 * 60000) }, // last 5 min
            },
            take: 3,
          });
          for (const email of recentEmails) {
            const msg = rule.message
              .replace('{{from}}', email.fromName || email.fromEmail || 'Unknown')
              .replace('{{subject}}', email.subject);
            banners.push({
              id: `${rule.id}-${email.id}`,
              ruleId: rule.id,
              name: rule.name,
              message: msg,
              style: rule.style,
              sound: rule.sound,
              eventType: rule.eventType,
            });
          }
          break;
        }

        // ── Contact Stale ───────────────────────────────────
        case 'contact_stale': {
          const staleDays = conditions.staleDays ?? 7;
          const staleContacts = await prisma.contact.findMany({
            where: {
              userId,
              updatedAt: { lt: new Date(now.getTime() - staleDays * 86400000) },
            },
            take: 3,
            orderBy: { updatedAt: 'asc' },
          });
          if (staleContacts.length > 0) {
            const names = staleContacts.map((c: any) => c.name).join(', ');
            const msg = rule.message
              .replace('{{count}}', String(staleContacts.length))
              .replace('{{names}}', names)
              .replace('{{days}}', String(staleDays));
            banners.push({
              id: `${rule.id}-stale`,
              ruleId: rule.id,
              name: rule.name,
              message: msg,
              style: rule.style,
              sound: rule.sound,
              eventType: rule.eventType,
            });
          }
          break;
        }

        // ── Card Moved ──────────────────────────────────────
        case 'card_moved': {
          const recentActivity = await prisma.activityLog.findMany({
            where: {
              action: 'card_moved',
              createdAt: { gte: new Date(now.getTime() - 5 * 60000) },
            },
            take: 3,
          });
          for (const act of recentActivity) {
            const msg = rule.message
              .replace('{{summary}}', act.summary || 'Card was moved');
            banners.push({
              id: `${rule.id}-${act.id}`,
              ruleId: rule.id,
              name: rule.name,
              message: msg,
              style: rule.style,
              sound: rule.sound,
              eventType: rule.eventType,
            });
          }
          break;
        }

        // ── Queue Item Added ────────────────────────────────
        case 'queue_added': {
          const recentQueue = await prisma.queueItem.findMany({
            where: {
              status: 'ready',
              createdAt: { gte: new Date(now.getTime() - 5 * 60000) },
            },
            take: 3,
          });
          for (const item of recentQueue) {
            const msg = rule.message
              .replace('{{title}}', item.title)
              .replace('{{source}}', item.source || 'system');
            banners.push({
              id: `${rule.id}-${item.id}`,
              ruleId: rule.id,
              name: rule.name,
              message: msg,
              style: rule.style,
              sound: rule.sound,
              eventType: rule.eventType,
            });
          }
          break;
        }

        // ── Custom (always show if enabled) ─────────────────
        case 'custom': {
          banners.push({
            id: `${rule.id}-custom`,
            ruleId: rule.id,
            name: rule.name,
            message: rule.message,
            style: rule.style,
            sound: rule.sound,
            eventType: rule.eventType,
          });
          break;
        }
      }
    }

    return NextResponse.json({ success: true, data: banners });
  } catch (error) {
    console.error('Notifications check error:', error);
    return NextResponse.json({ success: false, error: 'Failed to check notifications' }, { status: 500 });
  }
}
