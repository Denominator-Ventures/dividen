/**
 * DiviDen Three-Tier Memory System
 *
 * Tier 1: Explicit Facts — user or AI saved facts with scope and pinning
 * Tier 2: Behavioral Rules — directives governing AI behavior with priorities
 * Tier 3: Learned Patterns — AI observations with confidence scores
 *
 * Memory retrieval feeds directly into the 13-layer system prompt.
 */

import { prisma } from './prisma';
import type { MemoryTier, RulePriority } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER3_CONFIDENCE_THRESHOLD = 0.5;
const MAX_MEMORY_ITEMS_PER_TIER = 50;

// ─── Retrieval Functions ──────────────────────────────────────────────────────

/**
 * Retrieve Tier 1 facts — pinned items first, then by recency.
 */
export async function getTier1Facts(userId: string) {
  return prisma.memoryItem.findMany({
    where: { userId, tier: 1 },
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    take: MAX_MEMORY_ITEMS_PER_TIER,
  });
}

/**
 * Retrieve Tier 2 behavioral rules — by priority (critical first).
 */
export async function getTier2Rules(userId: string) {
  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const rules = await prisma.memoryItem.findMany({
    where: { userId, tier: 2 },
    take: MAX_MEMORY_ITEMS_PER_TIER,
  });

  return rules.sort(
    (a, b) => (priorityOrder[a.priority || 'medium'] || 2) - (priorityOrder[b.priority || 'medium'] || 2)
  );
}

/**
 * Retrieve Tier 3 learned patterns — only those with confidence >= threshold
 * and not rejected. Approved items first, then by confidence.
 */
export async function getTier3Patterns(userId: string) {
  return prisma.memoryItem.findMany({
    where: {
      userId,
      tier: 3,
      confidence: { gte: TIER3_CONFIDENCE_THRESHOLD },
      NOT: { approved: false }, // Exclude rejected
    },
    orderBy: [{ confidence: 'desc' }],
    take: MAX_MEMORY_ITEMS_PER_TIER,
  });
}

// ─── System Prompt Formatting ─────────────────────────────────────────────────

/**
 * Build the memory context block for the system prompt.
 * Includes all three tiers with appropriate formatting.
 */
export async function buildMemoryContext(userId: string): Promise<string> {
  const [facts, rules, patterns] = await Promise.all([
    getTier1Facts(userId),
    getTier2Rules(userId),
    getTier3Patterns(userId),
  ]);

  const sections: string[] = [];

  // Tier 1: Explicit Facts
  if (facts.length > 0) {
    const pinnedFacts = facts.filter((f) => f.pinned);
    const unpinnedFacts = facts.filter((f) => !f.pinned);

    let factSection = `### Tier 1: Explicit Facts (${facts.length} items)\n`;

    if (pinnedFacts.length > 0) {
      factSection += `\n**📌 Pinned (always prioritize):**\n`;
      for (const f of pinnedFacts) {
        const scopeTag = f.scope ? ` [${f.category}: ${f.scope}]` : ` [${f.category}]`;
        factSection += `- **${f.key}**${scopeTag}: ${f.value}\n`;
      }
    }

    if (unpinnedFacts.length > 0) {
      factSection += `\n**Facts:**\n`;
      for (const f of unpinnedFacts) {
        const scopeTag = f.scope ? ` [${f.category}: ${f.scope}]` : ` [${f.category}]`;
        factSection += `- **${f.key}**${scopeTag}: ${f.value}\n`;
      }
    }

    sections.push(factSection);
  }

  // Tier 2: Behavioral Rules
  if (rules.length > 0) {
    let ruleSection = `### Tier 2: Behavioral Rules (${rules.length} active)\n`;
    ruleSection += `Follow these behavioral directives:\n`;

    for (const r of rules) {
      const priorityTag = r.priority ? `[${r.priority.toUpperCase()}]` : '[MEDIUM]';
      ruleSection += `- ${priorityTag} **${r.key}**: ${r.value}\n`;
    }

    sections.push(ruleSection);
  }

  // Tier 3: Learned Patterns
  const approvedPatterns = patterns.filter((p) => p.approved === true);
  const pendingPatterns = patterns.filter((p) => p.approved === null);

  if (approvedPatterns.length > 0 || pendingPatterns.length > 0) {
    let patternSection = `### Tier 3: Learned Patterns\n`;

    if (approvedPatterns.length > 0) {
      patternSection += `\n**Confirmed patterns (use with confidence):**\n`;
      for (const p of approvedPatterns) {
        patternSection += `- [${p.category}] ${p.value} (confidence: ${(p.confidence ?? 0).toFixed(2)})\n`;
      }
    }

    if (pendingPatterns.length > 0) {
      patternSection += `\n**Observed patterns (use tentatively):**\n`;
      for (const p of pendingPatterns) {
        patternSection += `- [${p.category}] ${p.value} (confidence: ${(p.confidence ?? 0).toFixed(2)})\n`;
      }
    }

    sections.push(patternSection);
  }

  if (sections.length === 0) {
    return `## Layer 7: Memory\nNo memory items stored yet. Use [[update_memory:...]] and [[save_learning:...]] to build memory.`;
  }

  return `## Layer 7: Memory System\n\n${sections.join('\n')}`;
}

// ─── Memory Mutation Helpers ──────────────────────────────────────────────────

/**
 * Add or update a Tier 1 explicit fact.
 */
export async function upsertFact(
  userId: string,
  key: string,
  value: string,
  opts?: { category?: string; scope?: string; pinned?: boolean; source?: string }
) {
  return prisma.memoryItem.upsert({
    where: { userId_key: { userId, key } },
    create: {
      tier: 1,
      category: opts?.category || 'general',
      key,
      value,
      scope: opts?.scope || null,
      pinned: opts?.pinned || false,
      source: opts?.source || 'user',
      userId,
    },
    update: {
      value,
      category: opts?.category || undefined,
      scope: opts?.scope !== undefined ? opts.scope : undefined,
      pinned: opts?.pinned !== undefined ? opts.pinned : undefined,
    },
  });
}

/**
 * Add or update a Tier 2 behavioral rule.
 */
export async function upsertRule(
  userId: string,
  key: string,
  value: string,
  opts?: { category?: string; priority?: RulePriority; source?: string }
) {
  return prisma.memoryItem.upsert({
    where: { userId_key: { userId, key } },
    create: {
      tier: 2,
      category: opts?.category || 'workflow',
      key,
      value,
      priority: opts?.priority || 'medium',
      source: opts?.source || 'user',
      userId,
    },
    update: {
      value,
      category: opts?.category || undefined,
      priority: opts?.priority || undefined,
    },
  });
}

/**
 * Save a Tier 3 learned pattern.
 */
export async function savePattern(
  userId: string,
  key: string,
  value: string,
  opts?: { category?: string; confidence?: number; source?: string }
) {
  return prisma.memoryItem.upsert({
    where: { userId_key: { userId, key } },
    create: {
      tier: 3,
      category: opts?.category || 'preference',
      key,
      value,
      confidence: opts?.confidence ?? 0.5,
      approved: null,
      source: opts?.source || 'agent',
      userId,
    },
    update: {
      value,
      confidence: opts?.confidence !== undefined ? opts.confidence : undefined,
    },
  });
}

/**
 * Get memory statistics for a user.
 */
export async function getMemoryStats(userId: string) {
  const [tier1Count, tier2Count, tier3Count, pinnedCount, approvedCount, pendingCount] =
    await Promise.all([
      prisma.memoryItem.count({ where: { userId, tier: 1 } }),
      prisma.memoryItem.count({ where: { userId, tier: 2 } }),
      prisma.memoryItem.count({ where: { userId, tier: 3 } }),
      prisma.memoryItem.count({ where: { userId, tier: 1, pinned: true } }),
      prisma.memoryItem.count({ where: { userId, tier: 3, approved: true } }),
      prisma.memoryItem.count({ where: { userId, tier: 3, approved: null } }),
    ]);

  return {
    total: tier1Count + tier2Count + tier3Count,
    tier1: tier1Count,
    tier2: tier2Count,
    tier3: tier3Count,
    pinned: pinnedCount,
    approved: approvedCount,
    pending: pendingCount,
  };
}
