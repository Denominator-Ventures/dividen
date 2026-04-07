/**
 * Queue Dispatch Logic
 * 
 * Handles dispatching READY queue items to IN_PROGRESS based on operating mode:
 * - Cockpit mode: multiple items can be IN_PROGRESS simultaneously
 * - Chief of Staff mode: only one item can be IN_PROGRESS at a time
 */

import { prisma } from '@/lib/prisma';
import type { DividenMode } from '@/types';

interface DispatchResult {
  success: boolean;
  item?: any;
  error?: string;
}

/**
 * Dispatch the next READY item for a user.
 * Selects the highest-priority READY item and transitions it to IN_PROGRESS.
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

  // Find the next READY item, highest priority first, then oldest
  const nextItem = await prisma.queueItem.findFirst({
    where: { userId, status: 'ready' },
    orderBy: [{ createdAt: 'asc' }],
  });

  if (!nextItem) {
    return {
      success: false,
      error: 'No READY items in the queue.',
    };
  }

  // Among all ready items, find the one with highest priority
  const allReady = await prisma.queueItem.findMany({
    where: { userId, status: 'ready' },
    orderBy: { createdAt: 'asc' },
  });

  // Sort by priority manually
  const sorted = allReady.sort((a, b) => {
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

  return { success: true, item: updated };
}
