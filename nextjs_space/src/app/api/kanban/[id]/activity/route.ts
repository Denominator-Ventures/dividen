/**
 * GET /api/kanban/[id]/activity - Card-scoped activity feed
 * Returns both the card owner's activity AND cross-user mirror entries.
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

  // Verify the card belongs to this user
  const card = await prisma.kanbanCard.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const cursor = searchParams.get('cursor') || undefined;

  const entries = await prisma.activityLog.findMany({
    where: { cardId: params.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      action: true,
      actor: true,
      summary: true,
      isCrossUser: true,
      createdAt: true,
    },
  });

  const hasMore = entries.length > limit;
  const data = hasMore ? entries.slice(0, limit) : entries;
  const nextCursor = hasMore ? data[data.length - 1]?.id : null;

  return NextResponse.json({
    success: true,
    data,
    nextCursor,
  });
}
