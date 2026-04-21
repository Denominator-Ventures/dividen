import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

const INCLUDE_LINKED = {
  linkedCard: { select: { id: true, title: true, status: true } },
  linkedContact: { select: { id: true, name: true, company: true } },
  linkedRecording: { select: { id: true, title: true } },
  linkedDocument: { select: { id: true, title: true, type: true } },
};

// GET /api/comms — list messages (with optional state filter)
async function _GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;

    const { searchParams } = new URL(req.url);
    const state = searchParams.get('state');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const where: Record<string, unknown> = { userId: userId };
    if (state && state !== 'all') {
      where.state = state;
    }

    const messages = await prisma.commsMessage.findMany({
      where,
      include: INCLUDE_LINKED,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    console.error('Comms GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/comms — create a new message
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;

    const body = await req.json();
    const { content, sender, priority, linkedCardId, linkedContactId, linkedRecordingId, linkedDocumentId, metadata } = body;

    if (!content?.trim()) {
      return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
    }

    const message = await prisma.commsMessage.create({
      data: {
        content: content.trim(),
        sender: sender || 'user',
        priority: priority || 'normal',
        state: 'new',
        linkedCardId: linkedCardId || null,
        linkedContactId: linkedContactId || null,
        linkedRecordingId: linkedRecordingId || null,
        linkedDocumentId: linkedDocumentId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        userId: userId,
      },
      include: INCLUDE_LINKED,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'comms_message_sent',
        actor: sender || 'user',
        summary: `${sender === 'divi' ? 'Divi' : 'Operator'} sent a comms message`,
        metadata: JSON.stringify({ messageId: message.id, priority }),
        userId: userId,
      },
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error('Comms POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create message' }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
