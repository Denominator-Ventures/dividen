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
      }
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ success: true, data: cards });
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
