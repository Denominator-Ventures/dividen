export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pushRelayStateChanged } from '@/lib/webhook-push';
import { withTelemetry } from '@/lib/telemetry';

// PATCH /api/relays/[id] — update relay status, respond, etc.
async function _PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Must be involved in this relay
    if (relay.fromUserId !== userId && relay.toUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const data: any = {};

    if (body.status) {
      data.status = body.status;
      if (body.status === 'completed' || body.status === 'declined') {
        data.resolvedAt = new Date();
      }
    }

    if (body.responsePayload !== undefined) {
      data.responsePayload = typeof body.responsePayload === 'string'
        ? body.responsePayload
        : JSON.stringify(body.responsePayload);
    }

    const updated = await prisma.agentRelay.update({
      where: { id },
      data,
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

    // If completing/declining, notify the sender
    if ((body.status === 'completed' || body.status === 'declined') && relay.fromUserId !== userId) {
      const responderName = (session.user as any).name || (session.user as any).email || 'Someone';
      const statusLabel = body.status === 'completed' ? '✅ completed' : '❌ declined';
      await prisma.commsMessage.create({
        data: {
          sender: 'system',
          content: `📡 ${responderName} ${statusLabel} your relay: "${relay.subject}"`,
          state: 'new',
          priority: relay.priority || 'normal',
          userId: relay.fromUserId,
          metadata: JSON.stringify({ type: 'relay_response', relayId: id, status: body.status }),
        },
      });
    }

    // Push relay state change webhook (FVP Brief Proposal #1)
    if (body.status && body.status !== relay.status) {
      pushRelayStateChanged(relay.fromUserId, {
        relayId: id,
        threadId: updated.threadId,
        previousState: relay.status,
        newState: body.status,
        subject: relay.subject,
      });
    }

    // Push completion ack back to originating federated instance
    if ((body.status === 'completed' || body.status === 'declined') && relay.peerRelayId && relay.peerInstanceUrl) {
      try {
        const { pushRelayAckToFederatedInstance } = await import('@/lib/federation-push');
        pushRelayAckToFederatedInstance({
          id: relay.id,
          peerRelayId: relay.peerRelayId,
          peerInstanceUrl: relay.peerInstanceUrl,
          connectionId: relay.connectionId,
          subject: relay.subject,
          status: body.status,
          responsePayload: body.responsePayload || null,
        }).catch(() => {});
      } catch {}
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PATCH /api/relays/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update relay' }, { status: 500 });
  }
}

export const PATCH = withTelemetry(_PATCH);
