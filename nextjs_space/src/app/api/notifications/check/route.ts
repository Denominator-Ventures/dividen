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
      take: 50,
    });

    const banners: ActiveBanner[] = [];
    const now = new Date();

    if (rules.length === 0) {
      return NextResponse.json({ success: true, data: banners });
    }

    // Determine which event types are active to avoid unnecessary queries
    const activeTypes = new Set(rules.map((r) => r.eventType));

    // Pre-fetch ALL needed data in one parallel batch (eliminates N+1)
    const fiveMinAgo = new Date(now.getTime() - 5 * 60000);
    const [upcomingEvents, overdueItems, recentEmails, staleContacts, recentActivity, recentQueue] = await Promise.all([
      activeTypes.has('meeting_starting')
        ? prisma.calendarEvent.findMany({
            where: { userId, startTime: { gte: now, lte: new Date(now.getTime() + 30 * 60000) } },
            take: 5,
          })
        : Promise.resolve([]),
      activeTypes.has('task_overdue')
        ? prisma.queueItem.findMany({
            where: { userId, status: 'ready', createdAt: { lt: new Date(now.getTime() - 1 * 3600000) } },
            take: 5,
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve([]),
      activeTypes.has('email_received')
        ? prisma.emailMessage.findMany({
            where: { userId, isRead: false, receivedAt: { gte: fiveMinAgo } },
            take: 5,
          })
        : Promise.resolve([]),
      activeTypes.has('contact_stale')
        ? prisma.contact.findMany({
            where: { userId, updatedAt: { lt: new Date(now.getTime() - 7 * 86400000) } },
            take: 5,
            orderBy: { updatedAt: 'asc' },
          })
        : Promise.resolve([]),
      activeTypes.has('card_moved')
        ? prisma.activityLog.findMany({
            where: { userId, action: 'card_moved', createdAt: { gte: fiveMinAgo } },
            take: 5,
          })
        : Promise.resolve([]),
      activeTypes.has('queue_added')
        ? prisma.queueItem.findMany({
            where: { userId, status: 'ready', createdAt: { gte: fiveMinAgo } },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

    // Now evaluate rules against pre-fetched data — zero additional queries
    for (const rule of rules) {
      const conditions = rule.conditions ? JSON.parse(rule.conditions) : {};

      switch (rule.eventType) {
        case 'meeting_starting': {
          const minutesBefore = conditions.minutesBefore ?? 5;
          const windowEnd = new Date(now.getTime() + minutesBefore * 60 * 1000);
          const matching = (upcomingEvents as any[]).filter((e) => e.startTime <= windowEnd).slice(0, 3);
          for (const evt of matching) {
            const minsLeft = Math.max(0, Math.round((evt.startTime.getTime() - now.getTime()) / 60000));
            banners.push({
              id: `${rule.id}-${evt.id}`, ruleId: rule.id, name: rule.name,
              message: rule.message.replace('{{title}}', evt.title).replace('{{minutes}}', String(minsLeft)).replace('{{time}}', evt.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
              style: rule.style, sound: rule.sound, eventType: rule.eventType,
            });
          }
          break;
        }
        case 'task_overdue': {
          const hoursOverdue = conditions.hoursOverdue ?? 24;
          const cutoff = new Date(now.getTime() - hoursOverdue * 3600000);
          const matching = (overdueItems as any[]).filter((i) => i.createdAt < cutoff).slice(0, 3);
          for (const item of matching) {
            banners.push({
              id: `${rule.id}-${item.id}`, ruleId: rule.id, name: rule.name,
              message: rule.message.replace('{{title}}', item.title).replace('{{hours}}', String(Math.round((now.getTime() - item.createdAt.getTime()) / 3600000))),
              style: rule.style, sound: rule.sound, eventType: rule.eventType,
            });
          }
          break;
        }
        case 'email_received': {
          for (const email of (recentEmails as any[]).slice(0, 3)) {
            banners.push({
              id: `${rule.id}-${email.id}`, ruleId: rule.id, name: rule.name,
              message: rule.message.replace('{{from}}', email.fromName || email.fromEmail || 'Unknown').replace('{{subject}}', email.subject),
              style: rule.style, sound: rule.sound, eventType: rule.eventType,
            });
          }
          break;
        }
        case 'contact_stale': {
          const staleDays = conditions.staleDays ?? 7;
          const cutoff = new Date(now.getTime() - staleDays * 86400000);
          const matching = (staleContacts as any[]).filter((c) => c.updatedAt < cutoff).slice(0, 3);
          if (matching.length > 0) {
            const names = matching.map((c: any) => c.name).join(', ');
            banners.push({
              id: `${rule.id}-stale`, ruleId: rule.id, name: rule.name,
              message: rule.message.replace('{{count}}', String(matching.length)).replace('{{names}}', names).replace('{{days}}', String(staleDays)),
              style: rule.style, sound: rule.sound, eventType: rule.eventType,
            });
          }
          break;
        }
        case 'card_moved': {
          for (const act of (recentActivity as any[]).slice(0, 3)) {
            banners.push({
              id: `${rule.id}-${act.id}`, ruleId: rule.id, name: rule.name,
              message: rule.message.replace('{{summary}}', act.summary || 'Card was moved'),
              style: rule.style, sound: rule.sound, eventType: rule.eventType,
            });
          }
          break;
        }
        case 'queue_added': {
          for (const item of (recentQueue as any[]).slice(0, 3)) {
            banners.push({
              id: `${rule.id}-${item.id}`, ruleId: rule.id, name: rule.name,
              message: rule.message.replace('{{title}}', item.title).replace('{{source}}', item.source || 'system'),
              style: rule.style, sound: rule.sound, eventType: rule.eventType,
            });
          }
          break;
        }
        case 'custom': {
          banners.push({
            id: `${rule.id}-custom`, ruleId: rule.id, name: rule.name,
            message: rule.message, style: rule.style, sound: rule.sound, eventType: rule.eventType,
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
