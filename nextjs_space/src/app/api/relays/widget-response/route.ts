export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pushRelayStateChanged } from '@/lib/webhook-push';
import { withTelemetry } from '@/lib/telemetry';

/**
 * POST /api/relays/widget-response
 *
 * Records a user's interaction with an interactive widget attached to a relay.
 * Updates the relay's responsePayload with the widget response data.
 * If the relay has a linked queue item, syncs the response there too.
 *
 * Body: { relayId, widgetId, itemId, action, payload? }
 *
 * Flow:
 *   1. User sees widget in comms or queue (rendered from relay.payload.widgets)
 *   2. User clicks an action (approve, decline, select, etc.)
 *   3. This endpoint records the response on the relay
 *   4. If the originating relay has a widgetResponseUrl, forwards the response there
 */
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { relayId, widgetId, itemId, action, payload } = await req.json();
    if (!relayId || !action) {
      return NextResponse.json({ error: 'relayId and action are required' }, { status: 400 });
    }

    // Find the relay — user must be sender or receiver
    const relay = await prisma.agentRelay.findFirst({
      where: {
        id: relayId,
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
    });

    if (!relay) {
      return NextResponse.json({ error: 'Relay not found' }, { status: 404 });
    }

    // Build response entry — append to existing responsePayload if any
    let existingResponses: any[] = [];
    if (relay.responsePayload) {
      try {
        const parsed = JSON.parse(relay.responsePayload);
        existingResponses = Array.isArray(parsed.widgetResponses) ? parsed.widgetResponses : [];
      } catch {}
    }

    const responseEntry = {
      widgetId: widgetId || null,
      itemId: itemId || null,
      action,
      payload: payload || null,
      respondedAt: new Date().toISOString(),
      respondedBy: userId,
    };

    existingResponses.push(responseEntry);

    const updatedResponsePayload = JSON.stringify({
      widgetResponses: existingResponses,
      lastAction: action,
      lastResponseAt: new Date().toISOString(),
    });

    // Update relay
    await prisma.agentRelay.update({
      where: { id: relayId },
      data: {
        responsePayload: updatedResponsePayload,
        // If this is a terminal action (approve/decline/submit), mark relay as completed
        ...((['approve', 'decline', 'submit', 'confirm', 'reject'].includes(action))
          ? { status: 'completed', resolvedAt: new Date() }
          : { status: 'user_review' }),
      },
    });

    // Push webhook for relay state change
    pushRelayStateChanged(userId, {
      relayId: relay.id,
      threadId: relay.threadId,
      previousState: relay.status,
      newState: ['approve', 'decline', 'submit', 'confirm', 'reject'].includes(action) ? 'completed' : 'user_review',
      subject: relay.subject,
      message: `Widget response: ${action}`,
    });

    // If the relay has a linked queue item, update its metadata with the response
    if (relay.queueItemId) {
      const item = await prisma.queueItem.findFirst({
        where: { id: relay.queueItemId },
      });
      if (item) {
        let meta: any = {};
        try { if (item.metadata) meta = JSON.parse(item.metadata); } catch {}
        meta.widgetResponses = existingResponses;
        meta.lastWidgetAction = action;

        await prisma.queueItem.update({
          where: { id: item.id },
          data: {
            metadata: JSON.stringify(meta),
            // Terminal actions complete the queue item too
            ...(['approve', 'decline', 'submit', 'confirm', 'reject'].includes(action)
              ? { status: 'done_today' }
              : {}),
          },
        });
      }
    }

    // If relay payload has a widgetResponseUrl, forward the response (fire-and-forget)
    let payloadObj: any = null;
    try { if (relay.payload) payloadObj = JSON.parse(relay.payload); } catch {}
    if (payloadObj?.widgetResponseUrl) {
      fetch(payloadObj.widgetResponseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DiviDen-Event': 'widget_response',
        },
        body: JSON.stringify({
          relayId: relay.id,
          threadId: relay.threadId,
          response: responseEntry,
        }),
        signal: AbortSignal.timeout(10000),
      }).catch((err) => console.error('[widget-response] Forward failed:', err));
    }

    return NextResponse.json({
      success: true,
      relayId,
      action,
      status: ['approve', 'decline', 'submit', 'confirm', 'reject'].includes(action) ? 'completed' : 'user_review',
    });
  } catch (error: any) {
    console.error('[widget-response] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withTelemetry(_POST);
