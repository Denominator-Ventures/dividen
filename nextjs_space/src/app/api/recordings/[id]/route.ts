import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

async function _PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const existing = await prisma.recording.findFirst({ where: { id: params.id, userId } });
  if (!existing) return NextResponse.json({ success: false, error: 'Recording not found' }, { status: 404 });

  const body = await req.json();
  const { title, transcript, summary, status, cardId } = body;

  const recording = await prisma.recording.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(transcript !== undefined && { transcript }),
      ...(summary !== undefined && { summary }),
      ...(status !== undefined && { status }),
      ...(cardId !== undefined && { cardId }),
    },
  });

  return NextResponse.json({ success: true, data: recording });
}

async function _DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const existing = await prisma.recording.findFirst({ where: { id: params.id, userId } });
  if (!existing) return NextResponse.json({ success: false, error: 'Recording not found' }, { status: 404 });

  await prisma.recording.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export const PUT = withTelemetry(_PUT);
export const DELETE = withTelemetry(_DELETE);
