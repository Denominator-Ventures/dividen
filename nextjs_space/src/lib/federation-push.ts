/**
 * Federation Push — fire-and-forget outbound relay/notification delivery to remote instances.
 * Used by queue-dispatch (task_route), action-tags (project_invite), and future federation events.
 */

import { prisma } from '@/lib/prisma';

interface FederationConnection {
  isFederated: boolean;
  peerInstanceUrl: string | null;
  federationToken: string | null;
  peerUserEmail: string | null;
}

/**
 * Push a relay payload to a remote federated instance.
 * Fire-and-forget — logs errors but never blocks the caller.
 */
export async function pushRelayToFederatedInstance(
  connectionId: string,
  payload: {
    relayId: string;
    fromUserEmail: string;
    fromUserName: string;
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

    const remoteUrl = `${conn.peerInstanceUrl.replace(/\/$/, '')}/api/federation/relay`;
    const body = {
      connectionId,
      ...payload,
      toUserEmail: payload.toUserEmail || conn.peerUserEmail,
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
      } else {
        console.log(`[federation-push] Pushed ${payload.intent} relay ${payload.relayId} to ${conn.peerInstanceUrl}`);
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
