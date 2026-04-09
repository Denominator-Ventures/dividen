/**
 * DEP-008: Webhook Push for Agent Events
 *
 * Fire-and-forget webhook delivery to external execution agents.
 * Events: task_dispatched, new_message, wake, queue_changed
 *
 * Configuration stored in ServiceApiKey with provider='webhook_push'.
 */

import { prisma } from '@/lib/prisma';

export type WebhookEvent = 'task_dispatched' | 'new_message' | 'wake' | 'queue_changed';

interface WebhookConfig {
  url: string;
  token?: string;
}

/**
 * Get webhook configuration for a user from ServiceApiKey.
 */
async function getWebhookConfig(userId: string): Promise<WebhookConfig | null> {
  const config = await prisma.serviceApiKey.findFirst({
    where: { userId, service: 'webhook_push' },
  });
  if (!config) return null;
  try {
    const data = JSON.parse(config.keyValue);
    return { url: data.url, token: data.token };
  } catch {
    return null;
  }
}

/**
 * Push a webhook event to the configured endpoint.
 * Fire-and-forget — failures are logged but never block the caller.
 */
export async function pushWebhookEvent(
  userId: string,
  event: WebhookEvent,
  payload: any
): Promise<void> {
  const config = await getWebhookConfig(userId);
  if (!config?.url) return; // No webhook configured, silent no-op

  try {
    await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
  } catch (err) {
    // Fire-and-forget — log but don't throw
    console.error(`[webhook-push] Failed to deliver ${event} to ${config.url}:`, (err as Error).message);
  }
}

// ── Convenience Functions ──

export async function pushTaskDispatched(userId: string, data: {
  relayId: string;
  queueItemId: string;
  title: string;
  description?: string;
  input?: string;
  card?: { id: string; title: string; stage: string };
}) {
  return pushWebhookEvent(userId, 'task_dispatched', data);
}

export async function pushNewMessage(userId: string, data: {
  messageId: string;
  from: string;
  content: string;
  messageType?: string;
}) {
  return pushWebhookEvent(userId, 'new_message', data);
}

export async function pushWake(userId: string, data: {
  reason: string;
  priority?: 'normal' | 'urgent';
  queueSnapshot?: { ready: number; inProgress: number; blocked: number };
}) {
  return pushWebhookEvent(userId, 'wake', data);
}

export async function pushQueueChanged(userId: string, data: {
  changeType: 'added' | 'reordered' | 'status_changed' | 'removed';
  itemId: string;
  itemTitle: string;
  newStatus?: string;
}) {
  return pushWebhookEvent(userId, 'queue_changed', data);
}
