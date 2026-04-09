/**
 * Queue Deduplication System
 * 
 * Prevents duplicate queue items across all creation paths.
 * Uses Levenshtein similarity matching with configurable thresholds,
 * a 7-day completed-item window to avoid re-creating recently finished work,
 * and context merging for near-duplicates.
 * 
 * Unified interface: every queue creation path calls deduplicatedQueueCreate()
 * instead of prisma.queueItem.create() directly.
 */

import { prisma } from '@/lib/prisma';

// ── Levenshtein Distance ────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Use two-row optimization for memory efficiency
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lb];
}

/**
 * Calculate similarity ratio between two strings (0.0 to 1.0).
 * 1.0 = identical, 0.0 = completely different.
 */
function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const normalized_a = a.toLowerCase().trim();
  const normalized_b = b.toLowerCase().trim();
  if (normalized_a === normalized_b) return 1;
  const maxLen = Math.max(normalized_a.length, normalized_b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(normalized_a, normalized_b);
  return 1 - dist / maxLen;
}

// ── Configuration ───────────────────────────────────────────────────────────

const DEDUP_CONFIG = {
  /** Minimum title similarity to consider a match (0.0 - 1.0) */
  TITLE_SIMILARITY_THRESHOLD: 0.80,

  /** Minimum description similarity to consider a match (0.0 - 1.0) */
  DESCRIPTION_SIMILARITY_THRESHOLD: 0.65,

  /** Days to look back at completed items to prevent re-creation */
  COMPLETED_WINDOW_DAYS: 7,

  /** Active statuses that block duplicate creation */
  ACTIVE_STATUSES: ['ready', 'in_progress', 'blocked'] as const,

  /** Completed statuses within the lookback window */
  COMPLETED_STATUSES: ['done_today'] as const,
} as const;

// ── Types ───────────────────────────────────────────────────────────────────

export interface QueueCreateInput {
  type?: string;
  title: string;
  description?: string | null;
  priority?: string;
  status?: string;
  source?: string;
  userId?: string;
  metadata?: string | null;
  kanbanCardId?: string | null;
}

export interface DedupResult {
  /** Whether a new item was created */
  created: boolean;
  /** The queue item (new or existing match) */
  item: any;
  /** If deduplicated, explains why */
  reason?: string;
  /** If context was merged into an existing item */
  merged?: boolean;
}

// ── Core Dedup Logic ────────────────────────────────────────────────────────

/**
 * Create a queue item with deduplication.
 * 
 * Checks against:
 * 1. Active items (ready, in_progress, blocked) — exact and fuzzy title match
 * 2. Recently completed items (done_today within 7 days) — prevents re-creation
 * 
 * If a near-duplicate active item is found:
 * - If new item has additional context (description, metadata), merges it
 * - Returns the existing item instead of creating a new one
 * 
 * If a recently completed item matches:
 * - Returns the completed item with an explanation
 * - Does NOT re-create it
 */
export async function deduplicatedQueueCreate(
  input: QueueCreateInput
): Promise<DedupResult> {
  const {
    type = 'task',
    title,
    description = null,
    priority = 'medium',
    status = 'ready',
    source = 'user',
    userId,
    metadata = null,
    kanbanCardId = null,
  } = input;

  if (!title) {
    // No title = no dedup possible, just create
    const item = await prisma.queueItem.create({
      data: { type, title: title || 'Untitled', description, priority, status, source, userId, metadata },
    });
    return { created: true, item };
  }

  // Build the user filter
  const userFilter = userId ? { userId } : {};

  // ── 1. Check active items ──────────────────────────────────────────────
  const activeItems = await prisma.queueItem.findMany({
    where: {
      ...userFilter,
      status: { in: [...DEDUP_CONFIG.ACTIVE_STATUSES] },
    },
    orderBy: { createdAt: 'desc' },
  });

  for (const existing of activeItems) {
    const titleSim = similarity(title, existing.title);
    
    if (titleSim >= DEDUP_CONFIG.TITLE_SIMILARITY_THRESHOLD) {
      // Strong title match — check if we should merge context
      const merged = await maybeMergeContext(existing, { description, metadata });
      
      return {
        created: false,
        item: merged || existing,
        reason: titleSim === 1
          ? `Exact duplicate of active item "${existing.title}" (${existing.status})`
          : `Similar to active item "${existing.title}" (${(titleSim * 100).toFixed(0)}% match, ${existing.status})`,
        merged: !!merged,
      };
    }
  }

  // ── 2. Check recently completed items ──────────────────────────────────
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - DEDUP_CONFIG.COMPLETED_WINDOW_DAYS);

  const recentCompleted = await prisma.queueItem.findMany({
    where: {
      ...userFilter,
      status: { in: [...DEDUP_CONFIG.COMPLETED_STATUSES] },
      updatedAt: { gte: windowStart },
    },
    orderBy: { updatedAt: 'desc' },
  });

  for (const completed of recentCompleted) {
    const titleSim = similarity(title, completed.title);
    
    if (titleSim >= DEDUP_CONFIG.TITLE_SIMILARITY_THRESHOLD) {
      return {
        created: false,
        item: completed,
        reason: `Recently completed (${timeAgo(completed.updatedAt)}): "${completed.title}" (${(titleSim * 100).toFixed(0)}% match)`,
      };
    }
  }

  // ── 3. No duplicates found — create the item ──────────────────────────
  const item = await prisma.queueItem.create({
    data: { type, title, description, priority, status, source, userId, metadata },
  });

  return { created: true, item };
}

// ── Context Merging ─────────────────────────────────────────────────────────

/**
 * If the new item has additional context that the existing item lacks,
 * merge it in. Returns the updated item, or null if no merge was needed.
 */
async function maybeMergeContext(
  existing: any,
  incoming: { description?: string | null; metadata?: string | null }
): Promise<any | null> {
  const updates: Record<string, any> = {};

  // Merge description if existing is empty but incoming has one
  if (!existing.description && incoming.description) {
    updates.description = incoming.description;
  } else if (existing.description && incoming.description && incoming.description !== existing.description) {
    // Append new context to existing description if it's substantially different
    const descSim = similarity(existing.description, incoming.description);
    if (descSim < DEDUP_CONFIG.DESCRIPTION_SIMILARITY_THRESHOLD) {
      updates.description = `${existing.description}\n\n---\nAdditional context:\n${incoming.description}`;
    }
  }

  // Merge metadata
  if (incoming.metadata) {
    try {
      const existingMeta = existing.metadata ? JSON.parse(existing.metadata) : {};
      const incomingMeta = JSON.parse(incoming.metadata);
      const merged = { ...existingMeta, ...incomingMeta, _mergedAt: new Date().toISOString() };
      const mergedStr = JSON.stringify(merged);
      if (mergedStr !== existing.metadata) {
        updates.metadata = mergedStr;
      }
    } catch {
      // If metadata isn't valid JSON, skip merge
    }
  }

  if (Object.keys(updates).length === 0) return null;

  return prisma.queueItem.update({
    where: { id: existing.id },
    data: updates,
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Exports for testing / direct use ────────────────────────────────────────

export { similarity, levenshtein, DEDUP_CONFIG };
