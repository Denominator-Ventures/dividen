import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const documents = await prisma.document.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: documents });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const { title, content, type, tags, cardId, url, fileSource } = body;
  if (!title) return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });

  const document = await prisma.document.create({
    data: {
      title,
      content: content || null,
      type: type || 'note',
      tags: tags || null,
      url: url || null,
      fileSource: fileSource || 'local',
      cardId: cardId || null,
      userId,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: 'document_created',
      actor: 'user',
      summary: `Document created: ${title}`,
      metadata: JSON.stringify({ documentId: document.id, type: document.type }),
      userId,
    },
  });

  return NextResponse.json({ success: true, data: document });
}
