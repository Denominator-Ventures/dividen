export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

/**
 * POST /api/federation/relay-ack
 * 
 * Receives a completion/response acknowledgment from a remote federated instance.
 * When the receiving Divi completes a task, it pushes back here so the sending Divi
 * can close the loop: advance the queue item, update cards, checklist, and comms.
 * 
 * The sending Divi owns the lifecycle — this endpoint is the completion callback.
 */
export async function POST(req: NextRequest) {
  try {
    const federationToken = req.headers.get('x-federation-token');
    if (!federationToken) {
      return NextResponse.json({ error: 'Missing federation token' }, { status: 401 });
    }

    const fedConfig = await prisma.federationConfig.findFirst();
    if (!fedConfig || !fedConfig.allowInbound) {
      return NextResponse.json({ error: 'Inbound federation disabled' }, { status: 403 });
    }

    const body = await req.json();
    const {
      relayId,        // Our local relay ID (the one we sent)
      localRelayId,   // Remote instance's relay ID (informational)
      status,         // 'completed' | 'declined'
      responsePayload,
      subject,
      timestamp,
    } = body;

    if (!relayId || !status) {
      return NextResponse.json({ error: 'relayId and status are required' }, { status: 400 });
    }

    // Validate the federation token against an active connection
    const connection = await prisma.connection.findFirst({
      where: {
        isFederated: true,
        federationToken,
        status: 'active',
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'No active federated connection for this token' }, { status: 404 });
    }

    // Find the local relay
    const relay = await prisma.agentRelay.findUnique({ where: { id: relayId } });
    if (!relay) {
      return NextResponse.json({ error: 'Relay not found' }, { status: 404 });
    }

    const isTerminal = status === 'completed' || status === 'declined';
    const statusLabel = status === 'completed' ? '✅ completed' : status === 'declined' ? '❌ declined' : `→ ${status}`;
    const senderUserId = relay.fromUserId;

    // ── 1. Update relay status ──
    await prisma.agentRelay.update({
      where: { id: relayId },
      data: {
        status,
        responsePayload: responsePayload ? (typeof responsePayload === 'string' ? responsePayload : JSON.stringify(responsePayload)) : null,
        resolvedAt: isTerminal ? new Date() : undefined,
      },
    });

    // ── 2. Log activity ──
    await logActivity({
      userId: senderUserId,
      action: 'federation_relay_completed',
      summary: `📡 Remote agent ${statusLabel} relay: "${relay.subject}"`,
      metadata: {
        relayId,
        remoteRelayId: localRelayId,
        connectionId: connection.id,
        status,
        peerInstanceUrl: connection.peerInstanceUrl,
      },
    }).catch(() => {});

    // ── 3. Comms message to sender — response received ──
    await prisma.commsMessage.create({
      data: {
        sender: 'divi',
        content: `📡 Remote agent ${statusLabel} the task: "${relay.subject}"${responsePayload ? `\n\nResponse: ${typeof responsePayload === 'string' ? responsePayload : JSON.stringify(responsePayload)}` : ''}`,
        state: 'new',
        priority: relay.priority || 'normal',
        userId: senderUserId,
        metadata: JSON.stringify({
          type: 'federation_relay_completed',
          relayId,
          remoteRelayId: localRelayId,
          status,
          connectionId: connection.id,
          peerInstanceUrl: connection.peerInstanceUrl,
        }),
      },
    });

    // ── 4. Advance queue item → done ──
    if (relay.queueItemId && isTerminal) {
      const queueItem = await prisma.queueItem.findFirst({
        where: { id: relay.queueItemId, userId: senderUserId },
      });

      if (queueItem && queueItem.status !== 'done_today') {
        await prisma.queueItem.update({
          where: { id: queueItem.id },
          data: { status: 'done_today' },
        });

        // Trigger sequential dispatch for next task
        try {
          const { onTaskComplete } = await import('@/lib/cos-sequential-dispatch');
          await onTaskComplete(senderUserId, queueItem.id);
        } catch {}
      }
    }

    // ── 5. Update checklist item (delegation status) ──
    if (isTerminal) {
      try {
        const linkedChecklist = await prisma.checklistItem.findFirst({
          where: { sourceType: 'relay', sourceId: relayId },
        });
        if (linkedChecklist) {
          const newDelegationStatus = status === 'completed' ? 'completed' : 'declined';
          await prisma.checklistItem.update({
            where: { id: linkedChecklist.id },
            data: {
              delegationStatus: newDelegationStatus,
              completed: status === 'completed',
            },
          });
        }
      } catch {}
    }

    // ── 6. Update card status if all delegated items are done ──
    if (relay.cardId && isTerminal) {
      try {
        const { checkAndAutoCompleteCard } = await import('@/lib/card-auto-complete');
        await checkAndAutoCompleteCard(relay.cardId);
      } catch {}
    }

    // ── 7. Push relay state webhook (local webhook subscribers) ──
    try {
      const { pushRelayStateChanged } = await import('@/lib/webhook-push');
      pushRelayStateChanged(senderUserId, {
        relayId,
        threadId: relay.threadId,
        previousState: relay.status,
        newState: status,
        subject: relay.subject,
        message: responsePayload ? (typeof responsePayload === 'string' ? responsePayload : JSON.stringify(responsePayload)) : undefined,
      });
    } catch {}

    return NextResponse.json({ success: true, relayId, status });
  } catch (error: any) {
    console.error('POST /api/federation/relay-ack error:', error);
    return NextResponse.json({ error: error.message || 'Relay ack failed' }, { status: 500 });
  }
}
