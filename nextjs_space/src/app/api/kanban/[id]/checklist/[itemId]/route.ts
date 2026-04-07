/**
 * PATCH /api/kanban/[id]/checklist/[itemId] - Update checklist item
 * DELETE /api/kanban/[id]/checklist/[itemId] - Delete checklist item
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const updateData: any = {};
  if (body.text !== undefined) updateData.text = body.text;
  if (body.completed !== undefined) updateData.completed = body.completed;

  const item = await prisma.checklistItem.update({
    where: { id: params.itemId },
    data: updateData,
  });

  return NextResponse.json({ success: true, data: item });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.checklistItem.delete({ where: { id: params.itemId } });

  return NextResponse.json({ success: true });
}
