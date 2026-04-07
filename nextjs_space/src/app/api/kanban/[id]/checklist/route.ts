/**
 * GET /api/kanban/[id]/checklist - List checklist items for a card
 * POST /api/kanban/[id]/checklist - Add a checklist item
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  // Verify card ownership
  const card = await prisma.kanbanCard.findFirst({ where: { id: params.id, userId } });
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  const items = await prisma.checklistItem.findMany({
    where: { cardId: params.id },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json({ success: true, data: items });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const card = await prisma.kanbanCard.findFirst({ where: { id: params.id, userId } });
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  const body = await request.json();
  const { text } = body;

  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  const maxOrder = await prisma.checklistItem.aggregate({
    where: { cardId: params.id },
    _max: { order: true },
  });

  const item = await prisma.checklistItem.create({
    data: {
      text,
      cardId: params.id,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  return NextResponse.json({ success: true, data: item }, { status: 201 });
}
