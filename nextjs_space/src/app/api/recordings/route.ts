import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

async function _GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const recordings = await prisma.recording.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ success: true, data: recordings });
}

async function _POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const { title, source, transcript, summary, duration, metadata, cardId } = body;
  if (!title) return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });

  const recording = await prisma.recording.create({
    data: {
      title,
      source: source || 'generic',
      transcript: transcript || null,
      summary: summary || null,
      duration: duration || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      cardId: cardId || null,
      userId,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: 'recording_created',
      actor: 'user',
      summary: `Recording added: ${title}`,
      metadata: JSON.stringify({ recordingId: recording.id, source: recording.source }),
      userId,
    },
  });

  return NextResponse.json({ success: true, data: recording });
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
