/**
 * GET /api/kanban/[id] - Get single card
 * PATCH /api/kanban/[id] - Update card
 * DELETE /api/kanban/[id] - Delete card
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

  const card = await prisma.kanbanCard.findFirst({
    where: { id: params.id, userId },
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

  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: card });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();
  const { title, description, status, priority, assignee, dueDate } = body;

  // Verify ownership
  const existing = await prisma.kanbanCard.findFirst({ where: { id: params.id, userId } });
  if (!existing) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (assignee !== undefined) updateData.assignee = assignee;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

  const card = await prisma.kanbanCard.update({
    where: { id: params.id },
    data: updateData,
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

  return NextResponse.json({ success: true, data: card });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  // Verify ownership before delete
  const existing = await prisma.kanbanCard.findFirst({ where: { id: params.id, userId } });
  if (!existing) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }
  await prisma.kanbanCard.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
