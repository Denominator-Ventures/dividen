import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const INCLUDE_LINKED = {
  linkedCard: { select: { id: true, title: true, status: true } },
  linkedContact: { select: { id: true, name: true, company: true } },
};

// GET /api/emails — list emails
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'unread' | 'starred' | 'all'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const where: Record<string, unknown> = { userId };
    if (filter === 'unread') where.isRead = false;
    if (filter === 'starred') where.isStarred = true;

    const emails = await prisma.emailMessage.findMany({
      where,
      include: INCLUDE_LINKED,
      orderBy: { receivedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, data: emails });
  } catch (error) {
    console.error('Emails GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch emails' }, { status: 500 });
  }
}

// POST /api/emails — create email manually
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;

    const body = await req.json();
    const { subject, fromName, fromEmail, toEmail, bodyText, snippet, labels, linkedCardId, linkedContactId } = body;

    if (!subject) {
      return NextResponse.json({ success: false, error: 'Subject is required' }, { status: 400 });
    }

    const email = await prisma.emailMessage.create({
      data: {
        subject,
        fromName: fromName || null,
        fromEmail: fromEmail || null,
        toEmail: toEmail || null,
        body: bodyText || null,
        snippet: snippet || null,
        labels: labels || null,
        source: 'manual',
        linkedCardId: linkedCardId || null,
        linkedContactId: linkedContactId || null,
        userId,
      },
      include: INCLUDE_LINKED,
    });

    return NextResponse.json({ success: true, data: email });
  } catch (error) {
    console.error('Emails POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create email' }, { status: 500 });
  }
}
