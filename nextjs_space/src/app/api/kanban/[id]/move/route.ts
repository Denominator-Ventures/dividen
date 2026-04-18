/**
 * POST /api/kanban/[id]/move - Move card to a new column/position
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();
  const { status, order } = body;

  if (!status) {
    return NextResponse.json({ error: 'Status (target column) is required' }, { status: 400 });
  }

  // Get the card (verify ownership)
  const card = await prisma.kanbanCard.findFirst({ where: { id: params.id, userId } });
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  let newOrder = order;

  if (newOrder === undefined) {
    // Append to end of target column
    const maxOrder = await prisma.kanbanCard.aggregate({
      where: { userId, status },
      _max: { order: true },
    });
    newOrder = (maxOrder._max.order ?? -1) + 1;
  } else {
    // Shift existing cards in target column
    await prisma.kanbanCard.updateMany({
      where: {
        userId,
        status,
        order: { gte: newOrder },
        id: { not: params.id },
      },
      data: { order: { increment: 1 } },
    });
  }

  const updated = await prisma.kanbanCard.update({
    where: { id: params.id },
    data: { status, order: newOrder },
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

  logActivity({ userId, action: 'card_moved', summary: `Moved "${updated.title}" from ${card.status} → ${status}`, metadata: { cardId: updated.id, from: card.status, to: status }, cardId: updated.id });

  // v2: Propagate status change to linked cards
  if (status !== card.status) {
    try {
      const { propagateCardStatusChange } = await import('@/lib/card-links');
      await propagateCardStatusChange(updated.id, status);
    } catch {}

    // v2.2.0: Federation outbound push — mirror the stage move to any federated peer
    try {
      const federatedLinks = await prisma.cardLink.findMany({
        where: {
          OR: [{ fromCardId: updated.id }, { toCardId: updated.id }],
          externalInstanceUrl: { not: null },
          externalCardId: { not: null },
        },
      }).catch(() => [] as any[]);

      if (Array.isArray(federatedLinks) && federatedLinks.length > 0) {
        const { pushCardUpdate } = await import('@/lib/federation-push');
        const senderUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
        for (const link of federatedLinks as any[]) {
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

          let peerRelayId: string | null = null;
          if (link.relayId) {
            const rel = await prisma.agentRelay.findUnique({
              where: { id: link.relayId },
              select: { peerRelayId: true },
            }).catch(() => null);
            peerRelayId = rel?.peerRelayId || null;
          }

          pushCardUpdate(conn.id, {
            localCardId: updated.id,
            peerCardId: link.externalCardId,
            relayId: link.relayId || null,
            peerRelayId,
            newStage: status,
            reason: `Card moved from ${card.status} → ${status}`,
            fromUserId: userId,
            fromUserName: senderUser?.name || '',
            fromUserEmail: senderUser?.email || '',
          });
        }
      }
    } catch (fedErr: any) {
      console.warn('[kanban/move] federation push failed (non-fatal):', fedErr?.message);
    }
  }

  return NextResponse.json({ success: true, data: updated });
}
