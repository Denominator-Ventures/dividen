/**
 * PATCH /api/queue/[id] - Update queue item status
 * DELETE /api/queue/[id] - Delete queue item
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { validateStatusTransition, onTaskComplete } from '@/lib/cos-sequential-dispatch';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  
  // Verify ownership
  const existing = await prisma.queueItem.findFirst({ where: { id: params.id, userId } });
  if (!existing) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const body = await request.json();
  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.type !== undefined) updateData.type = body.type;

  // Status transition guard
  if (body.status !== undefined) {
    const validation = validateStatusTransition(existing.status, body.status);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    updateData.status = body.status;
  }

  const item = await prisma.queueItem.update({
    where: { id: params.id },
    data: updateData,
  });

  // CoS sequential dispatch: if item just completed, auto-dispatch next
  let autoDispatched = null;
  if (body.status === 'done_today') {
    const result = await onTaskComplete(userId, params.id);
    if (result.dispatched) {
      autoDispatched = result.item;
    }
  }

  return NextResponse.json({ success: true, data: item, autoDispatched });
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
  const existing = await prisma.queueItem.findFirst({ where: { id: params.id, userId } });
  if (!existing) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }
  await prisma.queueItem.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
