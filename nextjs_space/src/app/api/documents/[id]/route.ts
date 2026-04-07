import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, content, type, tags, cardId, url, fileSource } = body;

  const document = await prisma.document.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(type !== undefined && { type }),
      ...(tags !== undefined && { tags }),
      ...(cardId !== undefined && { cardId }),
      ...(url !== undefined && { url }),
      ...(fileSource !== undefined && { fileSource }),
    },
  });

  return NextResponse.json({ success: true, data: document });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await prisma.document.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
