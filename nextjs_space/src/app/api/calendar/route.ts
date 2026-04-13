import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

// GET /api/calendar — list events (optionally filter by date range)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);

    const where: Record<string, unknown> = { userId };
    if (from || to) {
      where.startTime = {};
      if (from) (where.startTime as any).gte = new Date(from);
      if (to) (where.startTime as any).lte = new Date(to);
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: 'asc' },
      take: limit,
    });

    // Get distinct account emails for multi-calendar filtering
    const accountEmails: string[] = [];
    const seen = new Set<string>();
    for (const e of events) {
      if (e.accountEmail && !seen.has(e.accountEmail)) {
        seen.add(e.accountEmail);
        accountEmails.push(e.accountEmail);
      }
    }

    return NextResponse.json({ success: true, data: events, accounts: accountEmails });
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST /api/calendar — create event manually
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;

    const body = await req.json();
    const { title, description, startTime, endTime, location, attendees } = body;

    if (!title || !startTime) {
      return NextResponse.json({ success: false, error: 'Title and startTime are required' }, { status: 400 });
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        location: location || null,
        attendees: attendees ? JSON.stringify(attendees) : null,
        source: 'manual',
        userId,
      },
    });

    logActivity({ userId, action: 'event_created', summary: `Created event "${event.title}"`, metadata: { eventId: event.id } });

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error('Calendar POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 });
  }
}
