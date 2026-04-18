/**
 * GET /api/kanban/[id] - Get single card
 * PATCH /api/kanban/[id] - Update card
 * DELETE /api/kanban/[id] - Delete card
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity';

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

  const changes = Object.keys(updateData).join(', ');
  logActivity({ userId, action: 'card_updated', summary: `Updated card "${card.title}" (${changes})`, metadata: { cardId: card.id, changes: updateData }, cardId: card.id });

  // v2: Propagate status/priority changes to linked cards
  if (status !== undefined || priority !== undefined) {
    const { propagateCardStatusChange } = await import('@/lib/card-links');
    await propagateCardStatusChange(card.id, status, priority);
  }

  // v2.2.0: Federation outbound push — if this card is linked to a federated peer's board,
  // push the update so their side stays in sync (title/status/priority).
  if (status !== undefined || priority !== undefined || title !== undefined) {
    try {
      const federatedLinks = await prisma.cardLink.findMany({
        where: {
          OR: [{ fromCardId: card.id }, { toCardId: card.id }],
          externalInstanceUrl: { not: null },
          externalCardId: { not: null },
        },
      }).catch(() => [] as any[]);

      if (Array.isArray(federatedLinks) && federatedLinks.length > 0) {
        const { pushCardUpdate } = await import('@/lib/federation-push');
        const senderUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
        for (const link of federatedLinks as any[]) {
          // Find the connection for this peer instance
          const conn = await prisma.connection.findFirst({
            where: {
              OR: [{ requesterId: userId }, { accepterId: userId }],
              isFederated: true,
              peerInstanceUrl: link.externalInstanceUrl,
              status: 'active',
            },
            select: { id: true },
          });
          if (!conn) continue;

          // Look up relay peer info for thread context (best effort)
          let peerRelayId: string | null = null;
          if (link.relayId) {
            const rel = await prisma.agentRelay.findUnique({
              where: { id: link.relayId },
              select: { peerRelayId: true },
            }).catch(() => null);
            peerRelayId = rel?.peerRelayId || null;
          }

          pushCardUpdate(conn.id, {
            localCardId: card.id,
            peerCardId: link.externalCardId,
            relayId: link.relayId || null,
            peerRelayId,
            newStage: status,
            newPriority: priority,
            title,
            fromUserId: userId,
            fromUserName: senderUser?.name || '',
            fromUserEmail: senderUser?.email || '',
          });
        }
      }
    } catch (fedErr: any) {
      console.warn('[kanban/PATCH] federation push failed (non-fatal):', fedErr?.message);
    }
  }

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

  logActivity({ userId, action: 'card_deleted', summary: `Deleted card "${existing.title}"`, metadata: { cardId: params.id }, cardId: params.id });

  return NextResponse.json({ success: true });
}
