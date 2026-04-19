/**
 * DEP-003: Bidirectional Relay↔Queue Bridge
 *
 * Keeps AgentRelay and QueueItem in sync:
 *   Direction 1: Relay → Queue (agent completes via A2A → mark QueueItem done)
 *   Direction 2: Queue → Relay (user completes via UI → mark AgentRelay completed)
 *   Direction 3: Dispatch → Both (CoS dispatches → creates linked relay + queue item)
 */

import { prisma } from '@/lib/prisma';
import { onTaskComplete } from '@/lib/cos-sequential-dispatch';

/**
 * Direction 1: Relay completion → Queue sync
 * Called when execution agent reports completion via tasks/respond.
 */
export async function syncQueueWithRelayCompletion(
  relayId: string,
  userId: string,
  result?: string
): Promise<{ dispatched: boolean; itemTitle?: string }> {
  // Find the relay and its linked QueueItem
  const relay = await prisma.agentRelay.findFirst({
    where: { id: relayId, OR: [{ fromUserId: userId }, { toUserId: userId }] },
  });

  if (!relay) return { dispatched: false };

  // Mark relay completed
  await prisma.agentRelay.update({
    where: { id: relayId },
    data: { status: 'completed', responsePayload: result || null, resolvedAt: new Date() },
  });

  // If linked to a queue item, mark it done too
  if (relay.queueItemId) {
    const item = await prisma.queueItem.findFirst({
      where: { id: relay.queueItemId, userId },
    });

    if (item && item.status !== 'done_today') {
      await prisma.queueItem.update({
        where: { id: item.id },
        data: { status: 'done_today' },
      });

      // Trigger sequential dispatch
      const dispatchResult = await onTaskComplete(userId, item.id);
      return { dispatched: dispatchResult.dispatched, itemTitle: item.title };
    }
  }

  return { dispatched: false };
}

/**
 * Direction 2: Queue completion → Relay sync
 * Called when user marks a queue item done via the dashboard UI.
 */
export async function syncRelayWithQueueCompletion(
  queueItemId: string,
  userId: string,
  note?: string
): Promise<void> {
  // Find any linked pending relay
  const relay = await prisma.agentRelay.findFirst({
    where: {
      queueItemId,
      status: { in: ['pending', 'delivered', 'agent_handling'] },
    },
  });

  if (relay) {
    await prisma.agentRelay.update({
      where: { id: relay.id },
      data: {
        status: 'completed',
        responsePayload: note || 'Completed via UI',
        resolvedAt: new Date(),
      },
    });
  }
}

/**
 * Direction 3: Create linked relay + queue item for dispatch.
 * Used by CoS sequential dispatch to create both records simultaneously.
 */
export async function createLinkedDispatch(
  userId: string,
  connectionId: string,
  item: { id: string; title: string; description?: string | null; metadata?: string | null; teamId?: string | null; projectId?: string | null },
  toUserId?: string,
  opts?: { widgets?: any[]; widgetResponseUrl?: string; teamId?: string | null; projectId?: string | null }
): Promise<{ relayId: string }> {
  // Build payload — include widget definitions if provided
  const payloadData: Record<string, any> = {
    taskId: item.id,
    title: item.title,
    description: item.description,
  };
  if (opts?.widgets?.length) {
    payloadData.widgets = opts.widgets;
  }
  if (opts?.widgetResponseUrl) {
    payloadData.widgetResponseUrl = opts.widgetResponseUrl;
  }

  // v2.3.2 — scope priority: explicit opts → queue item scope → none
  const relayTeamId = opts?.teamId || item.teamId || undefined;
  const relayProjectId = opts?.projectId || item.projectId || undefined;

  const relay = await prisma.agentRelay.create({
    data: {
      connectionId,
      fromUserId: userId,
      toUserId: toUserId || userId,
      direction: 'outbound',
      type: 'request',
      intent: 'assign_task',
      subject: item.title,
      payload: JSON.stringify(payloadData),
      status: 'pending',
      priority: 'normal',
      queueItemId: item.id,
      teamId: relayTeamId,
      projectId: relayProjectId,
    },
  });

  // If relay carries widgets, propagate to the linked queue item's metadata
  // so QueuePanel and ChatView can render them inline
  if (opts?.widgets?.length) {
    const widgetMeta = JSON.stringify({
      widgets: opts.widgets.map((w: any) => ({
        widget_type: w.widget_type || 'action_list',
        title: w.title || item.title,
        items: w.items || [],
        metadata: { relayId: relay.id, source: 'comm' },
      })),
    });
    await prisma.queueItem.update({
      where: { id: item.id },
      data: { metadata: widgetMeta },
    }).catch(() => {}); // Best-effort: queue item may not exist yet in all flows
  }

  return { relayId: relay.id };
}

/**
 * Create a queue item from an inbound relay that carries widget definitions.
 * Called when an inbound A2A task includes interactive widgets for the user.
 */
export async function createQueueItemFromRelay(
  relay: { id: string; subject: string; payload: string | null; fromUserId: string; toUserId: string | null },
  userId: string
): Promise<string | null> {
  let payloadObj: any = null;
  try { if (relay.payload) payloadObj = JSON.parse(relay.payload); } catch {}

  // Build queue item metadata with widget payload if present
  let metadata: string | null = null;
  if (payloadObj?.widgets?.length) {
    metadata = JSON.stringify({
      widgets: payloadObj.widgets.map((w: any) => ({
        widget_type: w.widget_type || 'action_list',
        title: w.title || relay.subject,
        items: w.items || [],
        metadata: { relayId: relay.id, source: 'comm' },
      })),
    });
  }

  const item = await prisma.queueItem.create({
    data: {
      type: 'task',
      title: relay.subject,
      description: payloadObj?.description || payloadObj?.message || null,
      priority: 'medium',
      status: 'ready',
      source: 'agent',
      userId,
      metadata,
    },
  });

  // Link relay to queue item
  await prisma.agentRelay.update({
    where: { id: relay.id },
    data: { queueItemId: item.id },
  });

  return item.id;
}
