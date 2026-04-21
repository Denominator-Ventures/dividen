/**
 * GET /api/contacts/[id]/activity
 *
 * Returns a unified activity timeline for a contact:
 * - Linked kanban cards
 * - Emails (linked or matched by email)
 * - Calendar events (matched by attendee email)
 * - Comms messages (linked)
 * - Relationships with other contacts
 * - Stats summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

async function _GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  try {
    const contact = await prisma.contact.findFirst({
      where: { id: params.id, userId },
      select: { id: true, name: true, email: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Run all queries in parallel
    const [emails, calendarEvents, commsMessages, relationships, linkedCards] = await Promise.all([
      // Emails: linked by ID or matched by email address
      prisma.emailMessage.findMany({
        where: {
          userId,
          OR: [
            { linkedContactId: contact.id },
            ...(contact.email ? [{ fromEmail: { equals: contact.email, mode: 'insensitive' as const } }] : []),
          ],
        },
        orderBy: { receivedAt: 'desc' },
        take: 15,
        select: {
          id: true,
          subject: true,
          fromName: true,
          fromEmail: true,
          snippet: true,
          isRead: true,
          isStarred: true,
          receivedAt: true,
        },
      }),

      // Calendar events: search attendees JSON for contact email
      contact.email
        ? prisma.calendarEvent.findMany({
            where: {
              userId,
              attendees: { contains: contact.email, mode: 'insensitive' },
            },
            orderBy: { startTime: 'desc' },
            take: 10,
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              location: true,
            },
          })
        : Promise.resolve([]),

      // Comms messages linked to this contact
      prisma.commsMessage.findMany({
        where: { userId, linkedContactId: contact.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          content: true,
          sender: true,
          state: true,
          priority: true,
          createdAt: true,
        },
      }),

      // Relationships (both directions)
      Promise.all([
        prisma.contactRelationship.findMany({
          where: { fromId: contact.id },
          include: { to: { select: { id: true, name: true, company: true, role: true, email: true } } },
        }),
        prisma.contactRelationship.findMany({
          where: { toId: contact.id },
          include: { from: { select: { id: true, name: true, company: true, role: true, email: true } } },
        }),
      ]).then(([from, to]) => {
        const rels = [
          ...from.map((r: any) => ({ id: r.id, type: r.type, label: r.label, direction: 'outgoing' as const, contact: r.to })),
          ...to.map((r: any) => ({ id: r.id, type: r.type, label: r.label, direction: 'incoming' as const, contact: r.from })),
        ];
        return rels;
      }),

      // Linked cards with details
      prisma.cardContact.findMany({
        where: { contactId: contact.id },
        include: {
          card: {
            select: { id: true, title: true, status: true, priority: true, dueDate: true, updatedAt: true },
          },
        },
      }),
    ]);

    // Build unified timeline
    const timeline: Array<{
      type: string;
      date: string;
      title: string;
      subtitle?: string;
      icon: string;
      id: string;
    }> = [];

    for (const e of emails) {
      timeline.push({
        type: 'email',
        date: new Date(e.receivedAt).toISOString(),
        title: e.subject || '(no subject)',
        subtitle: `From ${e.fromName || e.fromEmail}`,
        icon: e.isRead ? '📧' : '📬',
        id: e.id,
      });
    }

    for (const ev of calendarEvents) {
      timeline.push({
        type: 'calendar',
        date: new Date(ev.startTime).toISOString(),
        title: ev.title,
        subtitle: ev.location || undefined,
        icon: '📅',
        id: ev.id,
      });
    }

    for (const m of commsMessages) {
      const senders: Record<string, string> = { user: 'You', divi: 'Divi', system: 'System' };
      timeline.push({
        type: 'comms',
        date: new Date(m.createdAt).toISOString(),
        title: m.content.length > 80 ? m.content.slice(0, 80) + '…' : m.content,
        subtitle: `${senders[m.sender] || m.sender} · ${m.state}`,
        icon: '📡',
        id: m.id,
      });
    }

    for (const lc of linkedCards) {
      timeline.push({
        type: 'card',
        date: new Date(lc.card.updatedAt).toISOString(),
        title: lc.card.title,
        subtitle: `${lc.card.status} · ${lc.card.priority}${lc.role ? ` · ${lc.role}` : ''}`,
        icon: '📋',
        id: lc.card.id,
      });
    }

    // Sort timeline newest first
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Stats summary
    const stats = {
      emails: emails.length,
      calendarEvents: calendarEvents.length,
      commsMessages: commsMessages.length,
      linkedCards: linkedCards.length,
      relationships: relationships.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        stats,
        timeline,
        relationships,
        emails: emails.slice(0, 5),
        calendarEvents: calendarEvents.slice(0, 5),
      },
    });
  } catch (error: any) {
    console.error('[contacts/activity] Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
