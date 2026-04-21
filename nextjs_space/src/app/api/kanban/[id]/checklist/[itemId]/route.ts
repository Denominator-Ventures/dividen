/**
 * PATCH /api/kanban/[id]/checklist/[itemId] - Update checklist item
 * DELETE /api/kanban/[id]/checklist/[itemId] - Delete checklist item
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { checkAndAutoCompleteCard } from '@/lib/card-auto-complete';
import { logActivity } from '@/lib/activity';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

async function _PATCH(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  // Verify card ownership via parent card
  const card = await prisma.kanbanCard.findFirst({ where: { id: params.id, userId } });
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  const body = await request.json();
  const updateData: any = {};
  if (body.text !== undefined) updateData.text = body.text;
  if (body.completed !== undefined) updateData.completed = body.completed;

  const item = await prisma.checklistItem.update({
    where: { id: params.itemId },
    data: updateData,
  });

  // Log checklist item completion/unchecking
  if (body.completed !== undefined) {
    logActivity({
      userId,
      action: body.completed ? 'checklist_completed' : 'checklist_unchecked',
      summary: body.completed ? `Completed: "${item.text}"` : `Unchecked: "${item.text}"`,
      actor: 'user',
      cardId: params.id,
      metadata: { itemId: params.itemId, text: item.text, cardTitle: card.title },
    }).catch(() => {});
  }

  // Auto-complete the card if all checklist items are now done
  let cardAutoCompleted = false;
  if (body.completed === true) {
    cardAutoCompleted = await checkAndAutoCompleteCard(params.id, userId);
  }

  return NextResponse.json({ success: true, data: item, cardAutoCompleted });
}

async function _DELETE(
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

export const PATCH = withTelemetry(_PATCH);
export const DELETE = withTelemetry(_DELETE);
