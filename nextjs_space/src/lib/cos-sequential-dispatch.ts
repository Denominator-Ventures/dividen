/**
 * Chief of Staff — Sequential Dispatch Engine
 * 
 * Enforces the single-task-in-flight contract for CoS mode:
 *   1. When a task is marked done_today → auto-dispatch the next highest-priority READY item
 *   2. When the user switches INTO CoS mode → if nothing is in_progress, dispatch one
 *   3. Blocks resurrection of done_today items (no done_today → ready/in_progress)
 *
 * Cockpit mode is unaffected — these helpers short-circuit for non-CoS.
 */

import { prisma } from '@/lib/prisma';
import { pushTaskDispatched } from '@/lib/webhook-push';

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'];

async function getUserMode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { mode: true } });
  return user?.mode ?? 'cockpit';
}

/** Pick the highest-priority, oldest READY item for a user and move it to in_progress. */
async function dispatchTopReady(userId: string) {
  const readyItems = await prisma.queueItem.findMany({
    where: { userId, status: 'ready' },
    orderBy: { createdAt: 'asc' },
  });

  if (readyItems.length === 0) return null;

  // Sort by priority weight, then creation date
  readyItems.sort((a, b) => {
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

  return dispatched;
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

const VALID_STATUSES = ['ready', 'in_progress', 'done_today', 'blocked'];

/** Blocked transitions — prevents resurrecting completed items. */
const BLOCKED_TRANSITIONS: Record<string, string[]> = {
  done_today: ['ready', 'in_progress'],  // can't un-complete
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
