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
import { signPayload, HMAC_HEADER } from '@/lib/federation-hmac';
import { logActivity } from '@/lib/activity';

/** Build federation headers, optionally including HMAC signature. */
function federationHeaders(token: string, bodyJson: string, hmacEnabled?: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-federation-token': token,
  };
  if (hmacEnabled) {
    headers[HMAC_HEADER] = signPayload(bodyJson, token);
  }
  return headers;
}

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
    toUserName?: string;
    type: string;
    intent: string;
    subject: string;
    payload?: any;
    priority?: string;
    dueDate?: string | null;
    threadId?: string | null;
    parentRelayId?: string | null;
    // v2.3.2 — Multi-tenant routing fields. If present, receiver scopes the relay
    // and any surfaces derived from it (cards, comms) to the same project/team.
    teamId?: string | null;
    projectId?: string | null;
  }
): Promise<boolean> {
  try {
    const conn = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { isFederated: true, peerInstanceUrl: true, federationToken: true, hmacEnabled: true, peerUserEmail: true },
    });

    if (!conn?.isFederated || !conn.peerInstanceUrl || !conn.federationToken) {
      return false; // Not federated or missing config
    }

    // ── v2.3.0: Idempotency — if this relay was already pushed successfully (has peerRelayId
    // or is already marked delivered) DO NOT push again. Prevents the "relay loop" bug where
    // re-invocations of the same relay create duplicate peer records on the remote side.
    let threadId = payload.threadId || null;
    let parentRelayId = payload.parentRelayId || null;
    // v2.3.2 — pull scope off the stored relay when the caller didn't supply it
    let teamId = payload.teamId || null;
    let projectId = payload.projectId || null;
    try {
      const localRelay = await prisma.agentRelay.findUnique({
        where: { id: payload.relayId },
        select: { threadId: true, parentRelayId: true, peerRelayId: true, status: true, teamId: true, projectId: true },
      });
      if (localRelay) {
        threadId = threadId || localRelay.threadId;
        parentRelayId = parentRelayId || localRelay.parentRelayId;
        teamId = teamId || localRelay.teamId;
        projectId = projectId || localRelay.projectId;
        // Skip duplicate push
        if (localRelay.peerRelayId || localRelay.status === 'delivered' || localRelay.status === 'completed' || localRelay.status === 'declined') {
          console.log(`[federation-push] Skipping duplicate push for relay ${payload.relayId} (peerRelayId=${localRelay.peerRelayId}, status=${localRelay.status})`);
          return true;
        }
      }
    } catch {}

    // Include our instance's callback URL so the remote can push completion back
    const selfUrl = process.env.NEXTAUTH_URL || '';
    const remoteUrl = `${conn.peerInstanceUrl.replace(/\/$/, '')}/api/federation/relay`;
    const body = {
      connectionId,
      ...payload,
      threadId,
      parentRelayId,
      // v2.3.2 — multi-tenant routing fields on the wire
      teamId,
      projectId,
      toUserEmail: payload.toUserEmail || conn.peerUserEmail,
      callbackUrl: selfUrl ? `${selfUrl.replace(/\/$/, '')}/api/federation/relay-ack` : undefined,
    };

    const bodyJson1 = JSON.stringify(body);
    fetch(remoteUrl, {
      method: 'POST',
      headers: federationHeaders(conn.federationToken, bodyJson1, conn.hmacEnabled),
      body: bodyJson1,
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

      // Update local relay: store remote relay ID AND mark delivered (v2.3.0 loop fix).
      // Without this, status stays 'pending' forever — Divi keeps re-surfacing it and can
      // end up re-dispatching, which creates duplicate peer records.
      await prisma.agentRelay.update({
        where: { id: payload.relayId },
        data: {
          peerRelayId: remoteRelayId,
          peerInstanceUrl: conn.peerInstanceUrl,
          status: 'delivered',
        },
      }).catch(() => {});

      // Log activity — receipt confirmed
      const senderId = payload.fromUserId;
      if (senderId) {
        const targetLabel = payload.toUserName || conn.peerUserEmail || conn.peerInstanceUrl?.replace(/https?:\/\//, '') || 'remote agent';

        await logActivity({
          userId: senderId,
          action: 'federation_relay_acked',
          summary: `📡 Receipt confirmed: "${payload.subject}" delivered to ${targetLabel}`,
          metadata: { relayId: payload.relayId, remoteRelayId, connectionId, intent: payload.intent, targetName: targetLabel },
        }).catch(() => {});

        // Comms message — sender sees that the remote accepted, with target name
        await prisma.commsMessage.create({
          data: {
            sender: 'divi',
            content: `📡 Delivery confirmed — "${payload.subject}" received by ${targetLabel}`,
            state: 'new',
            priority: 'low',
            userId: senderId,
            metadata: JSON.stringify({
              type: 'federation_relay_acked',
              relayId: payload.relayId,
              remoteRelayId,
              connectionId,
              targetName: targetLabel,
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
    // v2.3.2 — echo scope back so the originating side can correlate audit rows
    teamId?: string | null;
    projectId?: string | null;
  }
): Promise<boolean> {
  try {
    if (!relay.peerInstanceUrl || !relay.peerRelayId) {
      return false; // Not a federated relay or no peer info
    }

    const conn = await prisma.connection.findUnique({
      where: { id: relay.connectionId },
      select: { federationToken: true, hmacEnabled: true },
    });
    if (!conn?.federationToken) return false;

    const remoteUrl = `${relay.peerInstanceUrl.replace(/\/$/, '')}/api/federation/relay-ack`;

    const ackBody = {
      relayId: relay.peerRelayId,
      localRelayId: relay.id,
      status: relay.status,
      responsePayload: relay.responsePayload,
      subject: relay.subject,
      teamId: relay.teamId || null,
      projectId: relay.projectId || null,
      timestamp: new Date().toISOString(),
    };
    const bodyJson2 = JSON.stringify(ackBody);
    fetch(remoteUrl, {
      method: 'POST',
      headers: federationHeaders(conn.federationToken, bodyJson2, conn.hmacEnabled),
      body: bodyJson2,
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
    // v2.3.2 — multi-tenant scope for federated notifications (e.g. project invites).
    // When present, the receiver MUST persist the scope on any derived record
    // (AgentRelay, CommsMessage) so it's discoverable in the project/team view.
    teamId?: string | null;
    projectId?: string | null;
  }
): Promise<boolean> {
  try {
    const conn = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { isFederated: true, peerInstanceUrl: true, federationToken: true, hmacEnabled: true, peerUserEmail: true },
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
      // v2.3.2 — multi-tenant routing fields
      teamId: notification.teamId || null,
      projectId: notification.projectId || null,
      timestamp: new Date().toISOString(),
    };

    const bodyJson3 = JSON.stringify(body);
    fetch(remoteUrl, {
      method: 'POST',
      headers: federationHeaders(conn.federationToken, bodyJson3, conn.hmacEnabled),
      body: bodyJson3,
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

/**
 * v2.2.0 — Push a Kanban card update to a federated peer that mirrors the card.
 * Called from the kanban PATCH/move route when a card with a linked CardLink
 * (externalInstanceUrl set) changes status/priority/title.
 *
 * The receiving instance exposes POST /api/federation/card-update with the same
 * envelope shape documented there.
 *
 * Non-blocking: fire-and-forget with a short timeout, logs on failure.
 */
export async function pushCardUpdate(
  connectionId: string,
  payload: {
    localCardId: string;        // OUR card ID — what the peer will look up as `peerCardId` on their side
    peerCardId?: string | null; // THEIR card ID — if we have it recorded
    relayId?: string | null;    // The relay that originated this card link (optional)
    peerRelayId?: string | null;
    newStage?: string;
    newPriority?: string;
    title?: string;
    reason?: string | null;
    fromUserId?: string;
    fromUserName?: string;
    fromUserEmail?: string;
  }
): Promise<boolean> {
  try {
    const conn = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { isFederated: true, peerInstanceUrl: true, federationToken: true, hmacEnabled: true, peerUserEmail: true, peerUserName: true },
    });

    if (!conn?.isFederated || !conn.peerInstanceUrl || !conn.federationToken) {
      return false;
    }

    const remoteUrl = `${conn.peerInstanceUrl.replace(/\/$/, '')}/api/federation/card-update`;
    const body = {
      // Translate OUR local ID → peer's view: localCardId becomes peerCardId for them,
      // and vice versa. We always echo BOTH sides so the peer can pick whichever works.
      peerCardId: payload.localCardId,        // on peer side, OUR id is THEIR "peer"
      localCardId: payload.peerCardId || null, // if we know their id, include it
      relayId: payload.peerRelayId || null,    // echo their relay id if we have it
      peerRelayId: payload.relayId || null,    // echo our relay id as "peer"
      newStage: payload.newStage,
      newPriority: payload.newPriority,
      title: payload.title,
      reason: payload.reason || null,
      fromUserName: payload.fromUserName,
      fromUserEmail: payload.fromUserEmail,
      timestamp: new Date().toISOString(),
    };

    const bodyJson4 = JSON.stringify(body);
    fetch(remoteUrl, {
      method: 'POST',
      headers: federationHeaders(conn.federationToken, bodyJson4, conn.hmacEnabled),
      body: bodyJson4,
      signal: AbortSignal.timeout(10000),
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn(`[federation-push] card-update to ${remoteUrl} returned ${res.status}: ${text}`);
      } else {
        const ack = await res.json().catch(() => ({}));
        console.log(`[federation-push] ✓ Card update pushed for ${payload.localCardId} to ${conn.peerInstanceUrl} (matched=${ack?.matched})`);

        // Log activity on our side for audit
        if (payload.fromUserId) {
          await logActivity({
            userId: payload.fromUserId,
            action: 'federation_card_update_sent',
            summary: `📡 Card update pushed to ${conn.peerUserName || conn.peerUserEmail || 'peer'}: ${payload.newStage ? `→ ${payload.newStage}` : ''}${payload.title ? ` "${payload.title}"` : ''}`,
            metadata: {
              connectionId,
              localCardId: payload.localCardId,
              peerCardId: payload.peerCardId,
              newStage: payload.newStage,
              newPriority: payload.newPriority,
              peerInstanceUrl: conn.peerInstanceUrl,
              matched: ack?.matched,
            },
          }).catch(() => {});
        }

        // Update CardLink.lastSyncedAt
        try {
          await prisma.cardLink.updateMany({
            where: {
              OR: [{ fromCardId: payload.localCardId }, { toCardId: payload.localCardId }],
              externalInstanceUrl: conn.peerInstanceUrl || undefined,
            },
            data: { lastSyncedAt: new Date() },
          });
        } catch {}
      }
    }).catch((err) => {
      console.warn(`[federation-push] Failed card-update push to ${conn.peerInstanceUrl}:`, err?.message);
    });

    return true;
  } catch (err: any) {
    console.warn(`[federation-push] card-update error:`, err?.message);
    return false;
  }
}