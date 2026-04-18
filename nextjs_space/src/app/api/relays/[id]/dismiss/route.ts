export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pushRelayStateChanged } from '@/lib/webhook-push';

/**
 * v2.3.0 — Dismiss/clear a relay from the operator's UI.
 *
 * This terminates the relay locally (status='declined' with a dismissal marker
 * in responsePayload). If the relay is federated (has peerRelayId), we push the
 * ack-back so the sender's instance also sees it resolved.
 *
 * Use case: Operator closes a purple component they don't want to act on, or
 * clears a stale green outgoing card. The relay disappears from Comms and from
 * Divi's context, breaking any surfacing loop.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { id } = params;

    const relay = await prisma.agentRelay.findUnique({
      where: { id },
      include: { connection: true },
    });
    if (!relay) {
      return NextResponse.json({ error: 'Relay not found' }, { status: 404 });
    }

    // Only the sender or recipient can dismiss
    if (relay.fromUserId !== userId && relay.toUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If already resolved, this is a no-op
    if (relay.status === 'completed' || relay.status === 'declined' || relay.status === 'expired') {
      return NextResponse.json({ success: true, already: true, relay });
    }

    let reason: string | undefined;
    try {
      const body = await req.json();
      if (typeof body?.reason === 'string' && body.reason.trim()) reason = body.reason.trim();
    } catch {}

    const dismissalMarker = reason
      ? `(dismissed by operator: ${reason})`
      : '(dismissed by operator)';

    const updated = await prisma.agentRelay.update({
      where: { id },
      data: {
        status: 'declined',
        resolvedAt: new Date(),
        responsePayload: dismissalMarker,
      },
      include: {
        connection: {
          include: {
            requester: { select: { id: true, name: true, email: true } },
            accepter: { select: { id: true, name: true, email: true } },
          },
        },
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
      },
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        action: 'relay_dismissed',
        actor: 'user',
        summary: `Dismissed relay "${relay.subject}"`,
        metadata: JSON.stringify({ relayId: id, connectionId: relay.connectionId, reason: reason || null }),
        userId,
      },
    }).catch(() => {});

    // Push state change webhook
    pushRelayStateChanged(userId, {
      relayId: id,
      threadId: updated.threadId,
      previousState: relay.status,
      newState: 'declined',
      subject: relay.subject,
    });

    // Push ack-back to originating federated instance so the sender's Divi sees it resolved
    if (relay.peerRelayId && relay.peerInstanceUrl) {
      try {
        const { pushRelayAckToFederatedInstance } = await import('@/lib/federation-push');
        pushRelayAckToFederatedInstance({
          id: relay.id,
          peerRelayId: relay.peerRelayId,
          peerInstanceUrl: relay.peerInstanceUrl,
          connectionId: relay.connectionId,
          subject: relay.subject,
          status: 'declined',
          responsePayload: dismissalMarker,
        }).catch(() => {});
      } catch {}
    }

    return NextResponse.json({ success: true, relay: updated });
  } catch (error: any) {
    console.error('POST /api/relays/[id]/dismiss error:', error);
    return NextResponse.json({ error: error.message || 'Failed to dismiss relay' }, { status: 500 });
  }
}
