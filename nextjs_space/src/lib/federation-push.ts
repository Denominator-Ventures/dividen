/**
 * Federation Push — outbound relay/notification delivery to remote instances.
 * 
 * pushRelayToFederatedInstance: Sends relay, processes ack (logs activity, updates status, comms to sender).
 * pushNotificationToFederatedInstance: Lightweight notification push (project invites, etc.).
 * pushRelayAckToFederatedInstance: Sends relay completion/response back to the originating instance.
 * 
 * The sending Divi owns the loop — every push expects an ack, every ack advances the task.
 */

import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

/**
 * Push a relay payload to a remote federated instance.
 * On successful ack (200): logs receipt, updates relay → "delivered", posts comms confirmation.
 * On failure: logs warning, relay stays as-is (remote can poll later).
 */
export async function pushRelayToFederatedInstance(
  connectionId: string,
  payload: {
    relayId: string;
    fromUserEmail: string;
    fromUserName: string;
    fromUserId?: string;
    toUserEmail?: string;
    type: string;
    intent: string;
    subject: string;
    payload?: any;
    priority?: string;
    dueDate?: string | null;
  }
): Promise<boolean> {
  try {
    const conn = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { isFederated: true, peerInstanceUrl: true, federationToken: true, peerUserEmail: true },
    });

    if (!conn?.isFederated || !conn.peerInstanceUrl || !conn.federationToken) {
      return false; // Not federated or missing config
    }

    // Include our instance's callback URL so the remote can push completion back
    const selfUrl = process.env.NEXTAUTH_URL || '';
    const remoteUrl = `${conn.peerInstanceUrl.replace(/\/$/, '')}/api/federation/relay`;
    const body = {
      connectionId,
      ...payload,
      toUserEmail: payload.toUserEmail || conn.peerUserEmail,
      callbackUrl: selfUrl ? `${selfUrl.replace(/\/$/, '')}/api/federation/relay-ack` : undefined,
    };

    fetch(remoteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-federation-token': conn.federationToken,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn(`[federation-push] ${remoteUrl} returned ${res.status}: ${text}`);
        return;
      }

      // ── Ack received — the remote instance accepted the relay ──
      const ackData = await res.json().catch(() => ({}));
      const remoteRelayId = ackData?.relayId || null;
      console.log(`[federation-push] ✓ Ack for ${payload.intent} relay ${payload.relayId} from ${conn.peerInstanceUrl} (remote: ${remoteRelayId})`);

      // Update local relay: store remote relay ID
      await prisma.agentRelay.update({
        where: { id: payload.relayId },
        data: {
          peerRelayId: remoteRelayId,
          peerInstanceUrl: conn.peerInstanceUrl,
        },
      }).catch(() => {});

      // Log activity — receipt confirmed
      const senderId = payload.fromUserId;
      if (senderId) {
        await logActivity({
          userId: senderId,
          action: 'federation_relay_acked',
          summary: `📡 Receipt confirmed: "${payload.subject}" delivered to ${conn.peerInstanceUrl}`,
          metadata: { relayId: payload.relayId, remoteRelayId, connectionId, intent: payload.intent },
        }).catch(() => {});

        // Comms message — sender sees that the remote accepted
        await prisma.commsMessage.create({
          data: {
            sender: 'divi',
            content: `📡 Delivery confirmed — "${payload.subject}" received by remote agent at ${conn.peerInstanceUrl?.replace(/https?:\/\//, '')}`,
            state: 'new',
            priority: 'low',
            userId: senderId,
            metadata: JSON.stringify({
              type: 'federation_relay_acked',
              relayId: payload.relayId,
              remoteRelayId,
              connectionId,
              peerInstanceUrl: conn.peerInstanceUrl,
            }),
          },
        }).catch(() => {});
      }
    }).catch((err) => {
      console.warn(`[federation-push] Failed to push to ${conn.peerInstanceUrl}:`, err?.message);
    });

    return true;
  } catch (err: any) {
    console.warn(`[federation-push] Error:`, err?.message);
    return false;
  }
}

/**
 * Push a relay completion/response acknowledgment back to the originating instance.
 * Called when the receiving Divi completes a federated relay (relay_respond tag or completion).
 */
export async function pushRelayAckToFederatedInstance(
  relay: {
    id: string;
    peerRelayId: string | null;
    peerInstanceUrl: string | null;
    connectionId: string;
    subject: string;
    status: string;
    responsePayload: string | null;
  }
): Promise<boolean> {
  try {
    if (!relay.peerInstanceUrl || !relay.peerRelayId) {
      return false; // Not a federated relay or no peer info
    }

    const conn = await prisma.connection.findUnique({
      where: { id: relay.connectionId },
      select: { federationToken: true },
    });
    if (!conn?.federationToken) return false;

    const remoteUrl = `${relay.peerInstanceUrl.replace(/\/$/, '')}/api/federation/relay-ack`;

    fetch(remoteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-federation-token': conn.federationToken,
      },
      body: JSON.stringify({
        relayId: relay.peerRelayId,   // The relay ID on the originating instance
        localRelayId: relay.id,       // Our local relay ID
        status: relay.status,         // 'completed' | 'declined'
        responsePayload: relay.responsePayload,
        subject: relay.subject,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10000),
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn(`[federation-push] Ack-back to ${remoteUrl} returned ${res.status}: ${text}`);
      } else {
        console.log(`[federation-push] ✓ Completion ack pushed for relay ${relay.peerRelayId} to ${relay.peerInstanceUrl}`);
      }
    }).catch((err) => {
      console.warn(`[federation-push] Failed ack-back to ${relay.peerInstanceUrl}:`, err?.message);
    });

    return true;
  } catch (err: any) {
    console.warn(`[federation-push] Ack-back error:`, err?.message);
    return false;
  }
}

/**
 * Push a notification (non-relay) to a federated instance.
 * Used for project invites, connection events, etc.
 */
export async function pushNotificationToFederatedInstance(
  connectionId: string,
  notification: {
    type: string;
    fromUserName: string;
    fromUserEmail: string;
    title: string;
    body: string;
    metadata?: any;
  }
): Promise<boolean> {
  try {
    const conn = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { isFederated: true, peerInstanceUrl: true, federationToken: true, peerUserEmail: true },
    });

    if (!conn?.isFederated || !conn.peerInstanceUrl || !conn.federationToken) {
      return false;
    }

    const remoteUrl = `${conn.peerInstanceUrl.replace(/\/$/, '')}/api/federation/notifications`;
    const body = {
      type: notification.type,
      fromUserName: notification.fromUserName,
      fromUserEmail: notification.fromUserEmail,
      toUserEmail: conn.peerUserEmail,
      title: notification.title,
      body: notification.body,
      metadata: notification.metadata || {},
      timestamp: new Date().toISOString(),
    };

    fetch(remoteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-federation-token': conn.federationToken,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn(`[federation-push] Notification ${notification.type} to ${conn.peerInstanceUrl} returned ${res.status}: ${text}`);
      } else {
        console.log(`[federation-push] Notification ${notification.type} pushed to ${conn.peerInstanceUrl}`);
      }
    }).catch((err) => {
      console.warn(`[federation-push] Failed notification push to ${conn.peerInstanceUrl}:`, err?.message);
    });

    return true;
  } catch (err: any) {
    console.warn(`[federation-push] Notification error:`, err?.message);
    return false;
  }
}
