/**
 * Queue Dispatch Logic
 * 
 * Handles dispatching READY queue items to IN_PROGRESS based on operating mode:
 * - Cockpit mode: multiple items can be IN_PROGRESS simultaneously
 * - Chief of Staff mode: only one item can be IN_PROGRESS at a time
 * 
 * For task_route items, dispatch creates the relay, comms messages, and recipient kanban card.
 */

import { prisma } from '@/lib/prisma';
import type { DividenMode } from '@/types';

interface DispatchResult {
  success: boolean;
  item?: any;
  relayId?: string;
  recipientCardId?: string;
  error?: string;
}

/**
 * Dispatch the next READY item for a user.
 * Selects the highest-priority READY item and transitions it to IN_PROGRESS.
 * For task_route items, this also creates the relay and delivers to the recipient.
 */
export async function dispatchNextItem(
  userId: string,
  mode: DividenMode
): Promise<DispatchResult> {
  // In Chief of Staff mode, enforce single IN_PROGRESS rule
  if (mode === 'chief_of_staff') {
    const inProgressCount = await prisma.queueItem.count({
      where: { userId, status: 'in_progress' },
    });

    if (inProgressCount > 0) {
      return {
        success: false,
        error: 'Chief of Staff mode: complete the current in-progress item before dispatching a new one.',
      };
    }
  }

  // Priority order: urgent > high > medium > low
  const priorityOrder = ['urgent', 'high', 'medium', 'low'];

  // Among all ready items, find the one with highest priority
  const allReady = await prisma.queueItem.findMany({
    where: { userId, status: 'ready' },
    orderBy: { createdAt: 'asc' },
  });

  if (allReady.length === 0) {
    return {
      success: false,
      error: 'No READY items in the queue.',
    };
  }

  // Sort by priority manually
  const sorted = allReady.sort((a: any, b: any) => {
    const aIdx = priorityOrder.indexOf(a.priority);
    const bIdx = priorityOrder.indexOf(b.priority);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const topItem = sorted[0];

  // Update status to IN_PROGRESS
  const updated = await prisma.queueItem.update({
    where: { id: topItem.id },
    data: { status: 'in_progress' },
  });

  // ── If this is a task_route item, execute the relay + delivery pipeline ──
  let relayId: string | undefined;
  let recipientCardId: string | undefined;

  try {
    const meta = topItem.metadata ? JSON.parse(topItem.metadata) : null;
    if (meta?.type === 'task_route' && meta.targetUserId && meta.connectionId) {
      const result = await executeTaskRouteDispatch(userId, topItem.id, meta);
      relayId = result.relayId;
      recipientCardId = result.recipientCardId;
    } else if (meta?.kind === 'marketplace_execute' && meta.agentId && meta.prompt) {
      // FVP Build 522 §2 behavior #5: user approved a marketplace agent run.
      // Execute it now via action-tags with skipQueue=true so we bypass the gate.
      try {
        const { executeTag } = await import('./action-tags');
        await executeTag(
          { name: 'execute_agent', params: { agentId: meta.agentId, prompt: meta.prompt, skipQueue: true }, raw: '' },
          userId,
        );
        // Mark done_today so it drops off the active queue
        await prisma.queueItem.update({ where: { id: topItem.id }, data: { status: 'done_today' } });
      } catch (err: any) {
        console.error(`[queue-dispatch] marketplace_execute failed for queue item ${topItem.id}:`, err?.message);
      }
    }
  } catch (err: any) {
    console.error(`[queue-dispatch] task_route dispatch error for queue item ${topItem.id}:`, err?.message);
    // Don't fail the dispatch — item is in_progress, relay creation failed
    // Log the error so it can be debugged
    await prisma.activityLog.create({
      data: {
        action: 'dispatch_error',
        actor: 'system',
        summary: `Failed to create relay for "${topItem.title}": ${err?.message}`,
        metadata: JSON.stringify({ queueItemId: topItem.id, error: err?.message }),
        userId,
      },
    }).catch(() => {});
  }

  return { success: true, item: updated, relayId, recipientCardId };
}

/**
 * Execute the relay + delivery pipeline for a dispatched task_route queue item.
 * Creates: relay, comms on recipient side, kanban card on recipient board,
 *          comms on sender side, checklist item on source card.
 */
export async function executeTaskRouteDispatch(
  userId: string,
  queueItemId: string,
  meta: any
): Promise<{ relayId: string; recipientCardId?: string }> {
  const {
    targetUserId,
    targetUserName,
    connectionId,
    routeMode = 'direct',
    intent = 'assign_task',
    taskTitle,
    taskDescription,
    taskPriority = 'medium',
    taskDueDate,
    requiredSkills = [],
    briefId,
    cardId,
    cardTitle,
    cardStatus,
    isAmbient,
    // v2.3.2 — multi-tenant scope propagated from the queue item metadata
    teamId: routeTeamId,
    projectId: routeProjectId,
  } = meta;

  // Build relay payload
  const relayPayload: any = {
    _briefId: briefId || undefined,
    task: { title: taskTitle, description: taskDescription, requiredSkills, intent, priority: taskPriority },
    ...(cardId ? { cardContext: { id: cardId, title: cardTitle, status: cardStatus } } : {}),
  };
  if (isAmbient) relayPayload._ambient = true;

  // ── Step 1: Create the relay ──
  const relay = await prisma.agentRelay.create({
    data: {
      connectionId,
      fromUserId: userId,
      toUserId: targetUserId,
      direction: 'outbound',
      type: 'request',
      intent,
      subject: taskTitle,
      payload: JSON.stringify(relayPayload),
      status: 'pending',
      priority: taskPriority,
      cardId: cardId || undefined,
      queueItemId,
      // v2.3.2 — multi-tenant routing so downstream surfaces (federation, peer card, comms filters) inherit scope
      teamId: routeTeamId || undefined,
      projectId: routeProjectId || undefined,
    },
  });

  // ── Step 2: Deliver to recipient — comms + kanban card ──
  const senderName = (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name || 'your connection';
  let recipientCardId: string | undefined;

  await prisma.commsMessage.create({
    data: {
      sender: 'divi',
      content: `📡 Task assigned from ${senderName}: "${taskTitle}"${taskDescription ? `\n\n${taskDescription}` : ''}`,
      state: 'new',
      priority: taskPriority,
      userId: targetUserId,
      metadata: JSON.stringify({
        type: 'agent_relay',
        relayId: relay.id,
        intent: 'assign_task',
        ...(cardId ? { cardContext: { id: cardId, title: cardTitle } } : {}),
      }),
    },
  });

  // Auto-create kanban card on recipient's board
  const recipientCard = await prisma.kanbanCard.create({
    data: {
      title: taskTitle,
      description: `${taskDescription || ''}\n\n---\n📡 Delegated from ${senderName}${cardTitle ? ` (project: ${cardTitle})` : ''}`.trim(),
      status: 'active',
      priority: taskPriority === 'urgent' ? 'urgent' : taskPriority === 'high' ? 'high' : 'medium',
      assignee: 'human',
      dueDate: taskDueDate ? new Date(taskDueDate) : null,
      userId: targetUserId,
      originCardId: cardId || null,
      originUserId: userId,
      // v2.3.2 — inherit project scope so recipient sees card under the right project board
      projectId: routeProjectId || undefined,
    },
  });
  recipientCardId = recipientCard.id;

  // Log activity on recipient side
  await prisma.activityLog.create({
    data: {
      action: 'task_received',
      actor: 'divi',
      summary: `New task from ${senderName}: "${taskTitle}"`,
      metadata: JSON.stringify({ relayId: relay.id, cardId: recipientCard.id, fromUserId: userId }),
      userId: targetUserId,
      cardId: recipientCard.id,
    },
  });

  // Mark relay as delivered
  await prisma.agentRelay.update({
    where: { id: relay.id },
    data: { status: 'delivered' },
  });

  // ── Step 2b: Federation push — if connection is federated, POST to remote instance ──
  const senderUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  const { pushRelayToFederatedInstance } = await import('./federation-push');
  pushRelayToFederatedInstance(connectionId, {
    relayId: relay.id,
    fromUserEmail: senderUser?.email || '',
    fromUserName: senderName,
    fromUserId: userId,
    toUserEmail: meta.targetUserEmail,
    toUserName: targetUserName,
    type: 'request',
    intent,
    subject: taskTitle,
    payload: relayPayload,
    priority: taskPriority,
    dueDate: taskDueDate || null,
    // v2.3.2 — forward multi-tenant scope on the wire (push helper also hydrates from stored relay)
    teamId: routeTeamId || null,
    projectId: routeProjectId || null,
  }).catch(() => {}); // fire-and-forget

  // ── Step 3: Comms on sender side (tracking thread) ──
  await prisma.commsMessage.create({
    data: {
      sender: 'divi',
      content: `📡 Task dispatched to ${targetUserName}: "${taskTitle}"`,
      state: 'new',
      priority: taskPriority,
      userId,
      metadata: JSON.stringify({
        type: 'task_route_sent',
        relayId: relay.id,
        routedTo: targetUserName,
        targetName: targetUserName,
        cardId: cardId || null,
        recipientCardId: recipientCard.id,
      }),
    },
  });

  // ── Step 4: Update brief with relay ID ──
  if (briefId) {
    await prisma.agentBrief.update({
      where: { id: briefId },
      data: { resultRelayId: relay.id },
    }).catch(() => {}); // non-critical
  }

  // ── Step 5: Log dispatch activity ──
  await prisma.activityLog.create({
    data: {
      action: 'task_dispatched',
      actor: 'divi',
      summary: `Dispatched task "${taskTitle}" to ${targetUserName} via ${routeMode} relay`,
      metadata: JSON.stringify({ briefId, relayId: relay.id, cardId, queueItemId, recipientCardId: recipientCard.id }),
      userId,
      cardId: cardId || null,
    },
  });

  // ── Step 6: Create checklist item on source card (if card exists) ──
  if (cardId) {
    try {
      const maxOrderResult = await prisma.checklistItem.aggregate({
        where: { cardId },
        _max: { order: true },
      });
      await prisma.checklistItem.create({
        data: {
          text: taskTitle + (taskDescription ? ` — ${taskDescription}` : ''),
          cardId,
          order: (maxOrderResult._max.order ?? -1) + 1,
          assigneeType: 'delegated',
          assigneeName: `${targetUserName} via Divi`,
          assigneeId: connectionId,
          delegationStatus: 'sent',
          dueDate: taskDueDate ? new Date(taskDueDate) : null,
          sourceType: 'relay',
          sourceId: relay.id,
          sourceLabel: `Dispatched to ${targetUserName}`,
        },
      });
    } catch (e: any) {
      console.warn(`[queue-dispatch] checklist item creation failed:`, e?.message);
    }
  }

  return { relayId: relay.id, recipientCardId };
}