import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await prisma.recording.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
