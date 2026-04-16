/**
 * Chief of Staff — Sequential Dispatch & Execution Engine
 * 
 * Enforces the single-task-in-flight contract for CoS mode:
 *   1. When a task is marked done_today → auto-dispatch & execute the next highest-priority READY item
 *   2. When the user switches INTO CoS mode → if nothing is in_progress, dispatch & execute one
 *   3. Blocks resurrection of done_today items (no done_today → ready/in_progress)
 *
 * "Execute" means:
 *   a) For capability tasks (email, meeting, etc.) → invoke the capability and log as activity
 *   b) For agent/delegation tasks → send a relay to the corresponding connected agent via comms
 *   c) For generic tasks → mark in_progress and log activity (Divi works on it)
 *
 * Cockpit mode is unaffected — these helpers short-circuit for non-CoS.
 */

import { prisma } from '@/lib/prisma';
import { pushTaskDispatched } from '@/lib/webhook-push';
import { logActivity } from '@/lib/activity';
import { dispatchNextItem } from '@/lib/queue-dispatch';

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'];

async function getUserMode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { mode: true } });
  return user?.mode ?? 'cockpit';
}

/**
 * Parse handler metadata from a queue item to determine execution strategy.
 */
function parseTaskHandler(item: any): { strategy: 'capability' | 'relay' | 'task_route' | 'generic'; handler?: any; meta?: any } {
  if (!item.metadata) return { strategy: 'generic' };
  try {
    const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
    // task_route items — handled by queue-dispatch.ts pipeline
    if (meta.type === 'task_route' && meta.targetUserId && meta.connectionId) {
      return { strategy: 'task_route', meta };
    }
    // Capability action — has capabilityType (email, meetings, etc.)
    if (meta.capabilityType) {
      return { strategy: 'capability', handler: meta.capabilityType, meta };
    }
    // Delegated to connected agent — has handler with connectionId
    if (meta.handler?.type === 'agent' && meta.handler?.connectionId) {
      return { strategy: 'relay', handler: meta.handler, meta };
    }
    // Installed capability handler
    if (meta.handler?.type === 'capability') {
      return { strategy: 'capability', handler: meta.handler, meta };
    }
    return { strategy: 'generic', meta };
  } catch {
    return { strategy: 'generic' };
  }
}

/**
 * Find a qualifying project contributor to delegate a task to.
 * Checks ProjectMember records for the item's project (or team's projects).
 * Returns the best-match connection if one exists, or null.
 */
async function findProjectContributor(
  userId: string,
  item: any,
  meta: any
): Promise<{ connectionId: string; peerName: string; projectId: string } | null> {
  // Determine which project this task belongs to
  const projectId = item.projectId || meta?.projectId;
  if (!projectId) return null;

  // Find all project members who are NOT the task owner and have a connection link
  const contributors = await prisma.projectMember.findMany({
    where: {
      projectId,
      role: { in: ['lead', 'contributor'] }, // observers and reviewers don't execute
      NOT: { userId },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      connection: {
        select: {
          id: true,
          status: true,
          peerUserName: true,
          peerUserEmail: true,
          nickname: true,
          accepterId: true,
          requesterId: true,
          peerUserId: true,
        },
      },
    },
  });

  if (contributors.length === 0) return null;

  // Prefer contributors with active connections (for relay delegation)
  // Local users without connections can't receive relays — they'd need to be on the same instance
  for (const c of contributors) {
    if (c.connection && c.connection.status === 'active') {
      return {
        connectionId: c.connection.id,
        peerName: c.connection.peerUserName || c.connection.nickname || c.user?.name || 'project contributor',
        projectId,
      };
    }
  }

  // Fall back to local users on the same instance (create a local relay)
  for (const c of contributors) {
    if (c.userId && c.user) {
      // Find or check if there's a connection between the task owner and this user
      const localConnection = await prisma.connection.findFirst({
        where: {
          status: 'active',
          OR: [
            { requesterId: userId, accepterId: c.userId },
            { requesterId: c.userId, accepterId: userId },
          ],
        },
      });
      if (localConnection) {
        return {
          connectionId: localConnection.id,
          peerName: c.user.name || c.user.email || 'project contributor',
          projectId,
        };
      }
    }
  }

  return null;
}

/**
 * Execute a queue item based on its handler type.
 * Strategy priority:
 *   1. Capability tasks → invoke the capability and log as activity
 *   2. Relay tasks (explicit handler) → send relay to the specified connected agent
 *   3. Project contributor delegation → if the task is in a project, delegate to a qualifying contributor
 *   4. Generic tasks → Divi works on it directly
 */
async function executeTask(userId: string, item: any): Promise<{ executed: boolean; method: string; detail?: string }> {
  const { strategy, handler, meta } = parseTaskHandler(item);

  switch (strategy) {
    case 'task_route': {
      // Use the shared dispatch pipeline from queue-dispatch.ts
      // The item is already in_progress, so we just need to execute the relay + delivery
      try {
        const { executeTaskRouteDispatch } = await import('@/lib/queue-dispatch');
        const result = await executeTaskRouteDispatch(userId, item.id, meta);
        await logActivity({
          userId,
          action: 'cos_task_route_dispatched',
          actor: 'divi',
          summary: `CoS dispatched task "${meta.taskTitle}" to ${meta.targetUserName} — relay ${result.relayId} created`,
        });
        return { executed: true, method: 'task_route', detail: `Dispatched to ${meta.targetUserName}` };
      } catch (err: any) {
        await logActivity({
          userId,
          action: 'cos_task_route_failed',
          actor: 'divi',
          summary: `CoS failed to dispatch "${meta.taskTitle}" to ${meta.targetUserName}: ${err?.message}`,
        });
        return { executed: false, method: 'task_route', detail: err?.message };
      }
    }

    case 'capability': {
      // Log the capability execution as an activity
      const capType = handler?.capabilityId || meta?.capabilityType || 'unknown';
      const action = meta?.action || 'execute';
      await logActivity({
        userId,
        action: 'cos_capability_executed',
        actor: 'divi',
        summary: `CoS executed capability "${capType}:${action}" — ${item.title}`,
      });
      return { executed: true, method: 'capability', detail: `${capType}:${action}` };
    }

    case 'relay': {
      // Send a relay to the connected agent via comms channel
      const connectionId = handler.connectionId;
      const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
      if (!connection) {
        await logActivity({ userId, action: 'cos_relay_failed', actor: 'divi', summary: `CoS could not find connection for task: ${item.title}` });
        return { executed: false, method: 'relay', detail: 'Connection not found' };
      }

      // Create a relay to the connected agent — prefer optimizedPayload if smart prompter ran
      const relayPayload = meta?.optimizedPayload
        ? { source: 'cos_mode', priority: item.priority || 'medium', ...meta.optimizedPayload }
        : { source: 'cos_mode', taskDescription: item.description || item.title, priority: item.priority || 'medium' };

      await prisma.agentRelay.create({
        data: {
          type: 'request',
          intent: 'assign_task',
          subject: meta?.displaySummary || item.title,
          payload: JSON.stringify(relayPayload),
          status: 'pending',
          fromUserId: userId,
          toUserId: connection.peerUserId || connection.accepterId || connection.requesterId,
          connectionId,
          queueItemId: item.id,
        },
      });

      const peerName = connection.peerUserName || connection.nickname || 'connected agent';
      await logActivity({
        userId,
        action: 'cos_relay_sent',
        actor: 'divi',
        summary: `CoS delegated "${item.title}" to ${peerName} via comms`,
      });
      return { executed: true, method: 'relay', detail: `Delegated to ${peerName}` };
    }

    default: {
      // Before falling back to generic, check if there's a project contributor we can delegate to
      const contributor = await findProjectContributor(userId, item, meta);
      if (contributor) {
        const relayPayload = meta?.optimizedPayload
          ? { source: 'cos_project_delegation', priority: item.priority || 'medium', projectId: contributor.projectId, ...meta.optimizedPayload }
          : { source: 'cos_project_delegation', taskDescription: item.description || item.title, priority: item.priority || 'medium', projectId: contributor.projectId };

        const connection = await prisma.connection.findUnique({ where: { id: contributor.connectionId } });
        if (connection) {
          await prisma.agentRelay.create({
            data: {
              type: 'request',
              intent: 'assign_task',
              subject: meta?.displaySummary || item.title,
              payload: JSON.stringify(relayPayload),
              status: 'pending',
              fromUserId: userId,
              toUserId: connection.peerUserId || connection.accepterId || connection.requesterId,
              connectionId: contributor.connectionId,
              queueItemId: item.id,
              projectId: contributor.projectId,
            },
          });

          await logActivity({
            userId,
            action: 'cos_project_delegated',
            actor: 'divi',
            summary: `CoS delegated "${item.title}" to project contributor ${contributor.peerName}`,
          });
          return { executed: true, method: 'project_delegation', detail: `Delegated to ${contributor.peerName}` };
        }
      }

      // Generic task — Divi is working on it
      await logActivity({
        userId,
        action: 'cos_task_started',
        actor: 'divi',
        summary: `CoS started working on: ${item.title}`,
      });
      return { executed: true, method: 'generic', detail: 'Divi is executing' };
    }
  }
}

/** Pick the highest-priority, oldest READY item for a user, move to in_progress, and execute. */
async function dispatchTopReady(userId: string) {
  const readyItems = await prisma.queueItem.findMany({
    where: { userId, status: 'ready' },
    orderBy: { createdAt: 'asc' },
  });

  if (readyItems.length === 0) return null;

  // Sort by priority weight, then creation date
  readyItems.sort((a: any, b: any) => {
    const aIdx = PRIORITY_ORDER.indexOf(a.priority);
    const bIdx = PRIORITY_ORDER.indexOf(b.priority);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const top = readyItems[0];
  const dispatched = await prisma.queueItem.update({
    where: { id: top.id },
    data: { status: 'in_progress' },
  });

  // DEP-008: fire webhook for dispatched task
  pushTaskDispatched(userId, {
    relayId: '',
    queueItemId: dispatched.id,
    title: dispatched.title,
    description: dispatched.description || undefined,
  });

  // Execute the task proactively
  const execResult = await executeTask(userId, dispatched);
  if (execResult.executed) {
    // Attach execution metadata to the item
    try {
      const existingMeta = dispatched.metadata ? JSON.parse(dispatched.metadata) : {};
      await prisma.queueItem.update({
        where: { id: dispatched.id },
        data: {
          metadata: JSON.stringify({
            ...existingMeta,
            cosExecution: {
              method: execResult.method,
              detail: execResult.detail,
              startedAt: new Date().toISOString(),
            },
          }),
        },
      });
    } catch { /* metadata update is best-effort */ }
  }

  return { ...dispatched, _execResult: execResult };
}

// ──────────────────────────────────────────────
//  Public API
// ──────────────────────────────────────────────

export interface SequentialDispatchResult {
  dispatched: boolean;
  item?: any;
  reason?: string;
}

/**
 * Called after a task transitions to done_today.
 * If the user is in CoS mode, automatically dispatches the next READY item.
 */
export async function onTaskComplete(
  userId: string,
  completedItemId: string
): Promise<SequentialDispatchResult> {
  const mode = await getUserMode(userId);

  // Cockpit mode — no auto-dispatch
  if (mode !== 'chief_of_staff') {
    return { dispatched: false, reason: 'cockpit_mode' };
  }

  // Safety: verify nothing else is still in_progress (besides the one we just completed)
  const stillInProgress = await prisma.queueItem.count({
    where: { userId, status: 'in_progress', id: { not: completedItemId } },
  });

  if (stillInProgress > 0) {
    return { dispatched: false, reason: 'another_item_in_progress' };
  }

  const next = await dispatchTopReady(userId);
  if (!next) {
    return { dispatched: false, reason: 'queue_empty' };
  }

  return { dispatched: true, item: next };
}

/**
 * Called when the user switches their mode to chief_of_staff.
 * If nothing is currently in_progress, dispatches the top READY item.
 */
export async function onEnterCoSMode(
  userId: string
): Promise<SequentialDispatchResult> {
  const inProgressCount = await prisma.queueItem.count({
    where: { userId, status: 'in_progress' },
  });

  if (inProgressCount > 0) {
    return { dispatched: false, reason: 'item_already_in_progress' };
  }

  const next = await dispatchTopReady(userId);
  if (!next) {
    return { dispatched: false, reason: 'queue_empty' };
  }

  return { dispatched: true, item: next };
}

// ──────────────────────────────────────────────
//  Status Guards
// ──────────────────────────────────────────────

const VALID_STATUSES = ['pending_confirmation', 'ready', 'in_progress', 'done_today', 'blocked'];

/** Blocked transitions — prevents resurrecting completed items. */
const BLOCKED_TRANSITIONS: Record<string, string[]> = {
  done_today: ['ready', 'in_progress'],  // can't un-complete
  pending_confirmation: ['in_progress', 'done_today'],  // must go through ready first
};

export interface StatusValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validates a proposed status transition.
 * Returns { valid: true } or { valid: false, error: '...' }.
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): StatusValidation {
  if (!VALID_STATUSES.includes(newStatus)) {
    return { valid: false, error: `Invalid status '${newStatus}'. Must be one of: ${VALID_STATUSES.join(', ')}` };
  }

  const blocked = BLOCKED_TRANSITIONS[currentStatus];
  if (blocked && blocked.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from '${currentStatus}' to '${newStatus}'. Completed items cannot be resurrected.`,
    };
  }

  return { valid: true };
}
