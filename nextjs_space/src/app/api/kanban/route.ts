/**
 * GET /api/kanban - List kanban cards
 * POST /api/kanban - Create a new card
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const cards = await prisma.kanbanCard.findMany({
    where: { userId },
    include: {
      checklist: { orderBy: { order: 'asc' } },
      contacts: {
        include: {
          contact: {
            select: { id: true, name: true, email: true, company: true }
          }
        }
      },
      project: {
        select: {
          id: true,
          name: true,
          members: {
            select: {
              id: true,
              role: true,
              userId: true,
              user: { select: { id: true, name: true, email: true } },
              connection: { select: { id: true, peerUserName: true, peerUserEmail: true } },
            },
          },
        },
      },
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });

  // Linked Kards: batch fetch all linked cards for this user's board
  try {
    const { getLinkedCardsForUser } = await import('@/lib/card-links');
    const linkedMap = await getLinkedCardsForUser(userId);
    const enriched = cards.map((card: any) => ({
      ...card,
      linkedCards: (linkedMap[card.id] || []).map((l: any) => ({
        linkId: l.linkId,
        linkedCardId: l.linkedCardId,
        linkedCardTitle: l.linkedCardTitle,
        linkedCardStatus: l.linkedCardStatus,
        linkedUserName: l.linkedUserName,
        direction: l.direction,
        linkType: l.linkType,
      })),
    }));
    return NextResponse.json({ success: true, data: enriched });
  } catch (e) {
    // Fallback: return cards without linked info
    return NextResponse.json({ success: true, data: cards });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();

  const { title, description, status = 'leads', priority = 'medium', assignee = 'human', dueDate } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // Get max order for the target column
  const maxOrder = await prisma.kanbanCard.aggregate({
    where: { userId, status },
    _max: { order: true },
  });

  const card = await prisma.kanbanCard.create({
    data: {
      title,
      description: description || null,
      status,
      priority,
      assignee,
      dueDate: dueDate ? new Date(dueDate) : null,
      order: (maxOrder._max.order ?? -1) + 1,
      userId,
    },
    include: {
      checklist: { orderBy: { order: 'asc' } },
      contacts: {
        include: {
          contact: {
            select: { id: true, name: true, email: true, company: true }
          }
        }
      }
    },
  });

  logActivity({ userId, action: 'card_created', summary: `Created card "${card.title}" in ${status}`, metadata: { cardId: card.id, status } });

  return NextResponse.json({ success: true, data: card }, { status: 201 });
}
