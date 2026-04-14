/**
 * Board Cortex — Intelligent board analysis layer.
 * Runs periodic scans to detect duplicates, stale cards, escalation candidates,
 * and produces a pre-digested context digest for Divi's system prompt.
 *
 * Philosophy: The board should be self-cleaning, and Divi should only see the sharpest version of reality.
 */

import { prisma } from '@/lib/prisma';
import { similarity } from '@/lib/queue-dedup';

// ── Types ───────────────────────────────────────────────────────────────────

export interface CortexCard {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: string;
  dueDate: Date | null;
  updatedAt: Date;
  projectId: string | null;
  project?: { name: string } | null;
  checklist: { id: string; text: string; completed: boolean; assigneeType: string; dueDate: Date | null }[];
  _count?: { emailMessages?: number; documents?: number; recordings?: number; calendarEvents?: number; commsMessages?: number; artifacts?: number };
  contacts?: { contact?: { name: string } | null; involvement: string; canDelegate: boolean }[];
}

export interface MergeSuggestion {
  sourceId: string;
  sourceTitle: string;
  targetId: string;
  targetTitle: string;
  confidence: number;
  reason: string;
}

export interface StaleCard {
  id: string;
  title: string;
  daysSinceUpdate: number;
  checklistProgress: number; // 0-100
  reason: string;
}

export interface EscalationCandidate {
  id: string;
  title: string;
  dueDate: Date;
  hoursLeft: number;
  checklistProgress: number;
  currentPriority: string;
  reason: string;
}

export interface ArchiveCandidate {
  id: string;
  title: string;
  reason: string;
}

export interface DuplicateTaskPair {
  cardA: { id: string; title: string };
  taskA: { id: string; text: string };
  cardB: { id: string; title: string };
  taskB: { id: string; text: string };
  similarity: number;
}

export interface BoardHealthSummary {
  totalCards: number;
  activeCards: number;
  staleCount: number;
  duplicatePairs: number;
  escalationCount: number;
  archiveCandidates: number;
  avgChecklistCompletion: number;
  topPriorityCards: { id: string; title: string; priority: string; dueDate: Date | null }[];
}

export interface ContextDigest {
  nowFocus: string;        // Top 3 items summary
  boardHealth: string;     // Health flags
  recentCompletions: string;
  insights: string;        // Active board insights for Divi
  fullDigest: string;      // Combined digest ready for system prompt
}

// ── Config ──────────────────────────────────────────────────────────────────

const CORTEX_CONFIG = {
  /** Minimum title similarity for card dedup */
  CARD_TITLE_THRESHOLD: 0.75,
  /** Minimum checklist text similarity for cross-card dedup */
  TASK_TEXT_THRESHOLD: 0.80,
  /** Days without update to flag as stale */
  STALE_THRESHOLD_DAYS: 14,
  /** Hours before deadline with <30% completion to trigger escalation */
  ESCALATION_HOURS: 48,
  ESCALATION_MIN_PROGRESS: 30,
  /** Days after completion to suggest archival */
  ARCHIVE_AFTER_DAYS: 2,
};

// ── Core Functions ──────────────────────────────────────────────────────────

/**
 * Detect potential duplicate or merge-worthy cards.
 * Compares titles using Levenshtein similarity.
 */
export function detectDuplicates(cards: CortexCard[]): MergeSuggestion[] {
  const suggestions: MergeSuggestion[] = [];
  const activeCards = cards.filter(c => !['completed', 'archived'].includes(c.status));

  for (let i = 0; i < activeCards.length; i++) {
    for (let j = i + 1; j < activeCards.length; j++) {
      const a = activeCards[i];
      const b = activeCards[j];
      const titleSim = similarity(a.title, b.title);

      if (titleSim >= CORTEX_CONFIG.CARD_TITLE_THRESHOLD) {
        // Determine which is the "primary" (more checklists, or older)
        const aWeight = a.checklist.length + (a.contacts?.length || 0);
        const bWeight = b.checklist.length + (b.contacts?.length || 0);
        const [target, source] = aWeight >= bWeight ? [a, b] : [b, a];

        suggestions.push({
          sourceId: source.id,
          sourceTitle: source.title,
          targetId: target.id,
          targetTitle: target.title,
          confidence: titleSim,
          reason: titleSim >= 0.95
            ? `Near-identical cards: "${source.title}" ≈ "${target.title}"`
            : `Similar cards (${(titleSim * 100).toFixed(0)}% match): "${source.title}" ↔ "${target.title}"`,
        });
      }
    }
  }

  return suggestions;
}

/**
 * Detect overlapping checklist items across different cards.
 */
export function detectDuplicateTasks(cards: CortexCard[]): DuplicateTaskPair[] {
  const pairs: DuplicateTaskPair[] = [];
  const activeCards = cards.filter(c => !['completed', 'archived'].includes(c.status));

  // Build flat list of incomplete tasks
  const allTasks: { card: CortexCard; task: CortexCard['checklist'][0] }[] = [];
  for (const card of activeCards) {
    for (const task of card.checklist) {
      if (!task.completed) allTasks.push({ card, task });
    }
  }

  for (let i = 0; i < allTasks.length; i++) {
    for (let j = i + 1; j < allTasks.length; j++) {
      // Skip if same card
      if (allTasks[i].card.id === allTasks[j].card.id) continue;

      const sim = similarity(allTasks[i].task.text, allTasks[j].task.text);
      if (sim >= CORTEX_CONFIG.TASK_TEXT_THRESHOLD) {
        pairs.push({
          cardA: { id: allTasks[i].card.id, title: allTasks[i].card.title },
          taskA: { id: allTasks[i].task.id, text: allTasks[i].task.text },
          cardB: { id: allTasks[j].card.id, title: allTasks[j].card.title },
          taskB: { id: allTasks[j].task.id, text: allTasks[j].task.text },
          similarity: sim,
        });
      }
    }
  }

  return pairs;
}

/**
 * Find stale cards — active but no updates for N days.
 */
export function findStaleCards(cards: CortexCard[], now: Date): StaleCard[] {
  const stale: StaleCard[] = [];
  const activeCards = cards.filter(c => !['completed', 'archived', 'paused'].includes(c.status));

  for (const card of activeCards) {
    const daysSince = (now.getTime() - new Date(card.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < CORTEX_CONFIG.STALE_THRESHOLD_DAYS) continue;

    const totalTasks = card.checklist.length;
    const doneTasks = card.checklist.filter(t => t.completed).length;
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    stale.push({
      id: card.id,
      title: card.title,
      daysSinceUpdate: Math.round(daysSince),
      checklistProgress: progress,
      reason: progress === 0
        ? `No activity for ${Math.round(daysSince)}d, 0% progress — consider archiving or re-prioritizing`
        : `No activity for ${Math.round(daysSince)}d, ${progress}% done — stuck?`,
    });
  }

  return stale;
}

/**
 * Find cards approaching deadline with low completion — candidates for auto-escalation.
 */
export function findEscalationCandidates(cards: CortexCard[], now: Date): EscalationCandidate[] {
  const candidates: EscalationCandidate[] = [];
  const activeCards = cards.filter(c => !['completed', 'archived', 'paused'].includes(c.status));

  for (const card of activeCards) {
    if (!card.dueDate) continue;
    const hoursLeft = (new Date(card.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursLeft < 0 || hoursLeft > CORTEX_CONFIG.ESCALATION_HOURS) continue;

    const totalTasks = card.checklist.length;
    const doneTasks = card.checklist.filter(t => t.completed).length;
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    if (progress < CORTEX_CONFIG.ESCALATION_MIN_PROGRESS) {
      candidates.push({
        id: card.id,
        title: card.title,
        dueDate: card.dueDate,
        hoursLeft: Math.round(hoursLeft),
        checklistProgress: progress,
        currentPriority: card.priority,
        reason: `Due in ${Math.round(hoursLeft)}h with only ${progress}% done — needs escalation to urgent`,
      });
    }
  }

  return candidates;
}

/**
 * Find completed cards ready for archival.
 */
export function findArchiveCandidates(cards: CortexCard[], now: Date): ArchiveCandidate[] {
  const candidates: ArchiveCandidate[] = [];

  for (const card of cards) {
    if (card.status !== 'completed') continue;
    const daysSince = (now.getTime() - new Date(card.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= CORTEX_CONFIG.ARCHIVE_AFTER_DAYS) {
      candidates.push({
        id: card.id,
        title: card.title,
        reason: `Completed ${Math.round(daysSince)}d ago — ready for archive`,
      });
    }
  }

  return candidates;
}

/**
 * Compute overall board health summary.
 */
export function computeBoardHealth(cards: CortexCard[], now: Date): BoardHealthSummary {
  const dupes = detectDuplicates(cards);
  const stale = findStaleCards(cards, now);
  const escalations = findEscalationCandidates(cards, now);
  const archives = findArchiveCandidates(cards, now);

  const activeCards = cards.filter(c => !['completed', 'archived'].includes(c.status));
  const completionRatios = activeCards
    .filter(c => c.checklist.length > 0)
    .map(c => c.checklist.filter(t => t.completed).length / c.checklist.length);
  const avgCompletion = completionRatios.length > 0
    ? Math.round((completionRatios.reduce((a, b) => a + b, 0) / completionRatios.length) * 100)
    : 0;

  // Top priority: urgent/high + soonest due
  const topCards = activeCards
    .filter(c => ['urgent', 'high'].includes(c.priority))
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.priority === 'urgent' ? -1 : 1;
    })
    .slice(0, 5);

  return {
    totalCards: cards.length,
    activeCards: activeCards.length,
    staleCount: stale.length,
    duplicatePairs: dupes.length,
    escalationCount: escalations.length,
    archiveCandidates: archives.length,
    avgChecklistCompletion: avgCompletion,
    topPriorityCards: topCards.map(c => ({ id: c.id, title: c.title, priority: c.priority, dueDate: c.dueDate })),
  };
}

/**
 * Build a compact context digest for Divi's system prompt.
 * Replaces the raw card dump with a pre-digested summary.
 */
export async function buildContextDigest(
  userId: string,
  cards: CortexCard[],
  now: Date
): Promise<ContextDigest> {
  const dupes = detectDuplicates(cards);
  const stale = findStaleCards(cards, now);
  const escalations = findEscalationCandidates(cards, now);
  const archives = findArchiveCandidates(cards, now);
  const dupeTasks = detectDuplicateTasks(cards);

  // Fetch active insights from DB
  const activeInsights = await prisma.boardInsight.findMany({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // ── Now Focus (top 3 active cards by priority/deadline) ──
  const activeCards = cards
    .filter(c => !['completed', 'archived', 'paused'].includes(c.status))
    .sort((a, b) => {
      const prio: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      const ps = (prio[b.priority] || 0) - (prio[a.priority] || 0);
      if (ps !== 0) return ps;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    })
    .slice(0, 5);

  const nowFocusLines = activeCards.map((c, i) => {
    const total = c.checklist.length;
    const done = c.checklist.filter(t => t.completed).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const due = c.dueDate ? ` due ${new Date(c.dueDate).toISOString().split('T')[0]}` : '';
    const proj = c.project?.name ? ` (${c.project.name})` : '';
    return `${i + 1}. "${c.title}"${proj} — ${c.priority}${due}, ${pct}% done (${done}/${total} tasks)`;
  });
  const nowFocus = nowFocusLines.length > 0
    ? 'TOP FOCUS:\n' + nowFocusLines.join('\n')
    : 'Board is clear — no active cards.';

  // ── Board Health ──
  const healthFlags: string[] = [];
  if (dupes.length > 0) healthFlags.push(`${dupes.length} potential duplicate card${dupes.length > 1 ? 's' : ''} detected — suggest merge`);
  if (dupeTasks.length > 0) healthFlags.push(`${dupeTasks.length} overlapping task${dupeTasks.length > 1 ? 's' : ''} across different cards`);
  if (stale.length > 0) healthFlags.push(`${stale.length} stale card${stale.length > 1 ? 's' : ''} (no activity ${CORTEX_CONFIG.STALE_THRESHOLD_DAYS}+ days)`);
  if (escalations.length > 0) healthFlags.push(`${escalations.length} card${escalations.length > 1 ? 's' : ''} approaching deadline with low completion`);
  if (archives.length > 0) healthFlags.push(`${archives.length} completed card${archives.length > 1 ? 's' : ''} ready for archive`);
  const boardHealth = healthFlags.length > 0
    ? 'BOARD HEALTH:\n' + healthFlags.map(f => `⚠️ ${f}`).join('\n')
    : 'BOARD HEALTH: ✅ Clean — no redundancies or stale items detected.';

  // ── Recent Completions ──
  const recentCompleted = cards
    .filter(c => c.status === 'completed')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);
  const recentCompletions = recentCompleted.length > 0
    ? 'RECENT COMPLETIONS:\n' + recentCompleted.map(c => {
        const ago = Math.round((now.getTime() - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60));
        return `- "${c.title}" completed ${ago < 24 ? `${ago}h ago` : `${Math.round(ago / 24)}d ago`}`;
      }).join('\n')
    : '';

  // ── Actionable Insights ──
  const insightLines: string[] = [];
  for (const d of dupes.slice(0, 3)) {
    insightLines.push(`MERGE: "${d.sourceTitle}" → "${d.targetTitle}" (${(d.confidence * 100).toFixed(0)}% match). Use [[merge_cards:{"sourceCardId":"${d.sourceId}","targetCardId":"${d.targetId}"}]] if operator agrees.`);
  }
  for (const e of escalations.slice(0, 3)) {
    insightLines.push(`ESCALATE: "${e.title}" due in ${e.hoursLeft}h at ${e.checklistProgress}%. Suggest [[update_card:{"id":"${e.id}","priority":"urgent"}]].`);
  }
  for (const s of stale.slice(0, 2)) {
    insightLines.push(`STALE: "${s.title}" — ${s.daysSinceUpdate}d idle, ${s.checklistProgress}%. Ask operator: continue, pause, or archive?`);
  }
  for (const dt of dupeTasks.slice(0, 2)) {
    insightLines.push(`OVERLAP: Task "${dt.taskA.text}" on "${dt.cardA.title}" ≈ "${dt.taskB.text}" on "${dt.cardB.title}" (${(dt.similarity * 100).toFixed(0)}%). Consider consolidating.`);
  }
  // Include persisted insights not already covered
  for (const ins of activeInsights.slice(0, 3)) {
    if (!insightLines.some(l => l.includes(ins.sourceId))) {
      insightLines.push(`INSIGHT [${ins.type}]: ${ins.reason}`);
    }
  }
  const insights = insightLines.length > 0
    ? 'BOARD INTELLIGENCE:\n' + insightLines.join('\n')
    : '';

  // ── Full Digest ──
  // Only include TOP FOCUS if there are health issues — otherwise the raw board listing + NOW section cover it
  const hasIssues = healthFlags.length > 0 || insightLines.length > 0;
  const sections = [
    hasIssues ? nowFocus : null,  // Skip focus summary when board is clean — raw board data is enough
    boardHealth,
    recentCompletions,
    insights,
  ].filter(Boolean) as string[];
  const fullDigest = sections.join('\n\n');

  return { nowFocus, boardHealth, recentCompletions, insights, fullDigest };
}

/**
 * Run full board scan — detect issues, persist insights, apply auto-housekeeping.
 * Called by /api/board/cortex or a scheduled daemon.
 */
export async function runBoardScan(userId: string): Promise<{
  duplicates: MergeSuggestion[];
  stale: StaleCard[];
  escalations: EscalationCandidate[];
  archives: ArchiveCandidate[];
  duplicateTasks: DuplicateTaskPair[];
  health: BoardHealthSummary;
  autoActions: string[];
}> {
  const now = new Date();

  // Fetch all cards with full context
  const cards = await prisma.kanbanCard.findMany({
    where: { userId },
    include: {
      checklist: { select: { id: true, text: true, completed: true, assigneeType: true, dueDate: true } },
      contacts: { include: { contact: { select: { name: true } } } },
      project: { select: { name: true } },
      _count: { select: { emailMessages: true, documents: true, recordings: true, calendarEvents: true, commsMessages: true, artifacts: true } },
    },
  }) as unknown as CortexCard[];

  const duplicates = detectDuplicates(cards);
  const stale = findStaleCards(cards, now);
  const escalations = findEscalationCandidates(cards, now);
  const archives = findArchiveCandidates(cards, now);
  const duplicateTasks = detectDuplicateTasks(cards);
  const health = computeBoardHealth(cards, now);
  const autoActions: string[] = [];

  // ── Auto-Housekeeping ────────────────────────────────────────────────

  // 1. Auto-escalate: bump priority to urgent for deadline-approaching cards
  for (const e of escalations) {
    if (e.currentPriority !== 'urgent') {
      await prisma.kanbanCard.update({
        where: { id: e.id },
        data: { priority: 'urgent' },
      });
      autoActions.push(`Auto-escalated "${e.title}" to urgent (${e.hoursLeft}h left, ${e.checklistProgress}% done)`);
    }
  }

  // 2. Persist new insights (upsert to avoid duplicates)
  // Clear old insights first
  await prisma.boardInsight.deleteMany({
    where: { userId, status: 'active' },
  });

  const insightsToCreate: { type: string; reason: string; sourceId: string; targetId?: string; confidence: number }[] = [];

  for (const d of duplicates) {
    insightsToCreate.push({
      type: 'merge_suggestion',
      reason: d.reason,
      sourceId: d.sourceId,
      targetId: d.targetId,
      confidence: d.confidence,
    });
  }
  for (const s of stale) {
    insightsToCreate.push({
      type: 'stale_card',
      reason: s.reason,
      sourceId: s.id,
      confidence: 0.9,
    });
  }
  for (const a of archives) {
    insightsToCreate.push({
      type: 'archive_candidate',
      reason: a.reason,
      sourceId: a.id,
      confidence: 0.95,
    });
  }
  for (const dt of duplicateTasks) {
    insightsToCreate.push({
      type: 'duplicate_tasks',
      reason: `"${dt.taskA.text}" on "${dt.cardA.title}" overlaps with "${dt.taskB.text}" on "${dt.cardB.title}"`,
      sourceId: dt.taskA.id,
      targetId: dt.taskB.id,
      confidence: dt.similarity,
    });
  }

  if (insightsToCreate.length > 0) {
    await prisma.boardInsight.createMany({
      data: insightsToCreate.map(i => ({ ...i, userId })),
    });
  }

  // 3. Log scan activity
  await prisma.activityLog.create({
    data: {
      action: 'board_scan',
      actor: 'system',
      summary: `Board scan: ${duplicates.length} duplicates, ${stale.length} stale, ${escalations.length} escalations, ${archives.length} archive candidates`,
      metadata: JSON.stringify({ duplicates: duplicates.length, stale: stale.length, escalations: escalations.length, archives: archives.length, duplicateTasks: duplicateTasks.length }),
      userId,
    },
  });

  return { duplicates, stale, escalations, archives, duplicateTasks, health, autoActions };
}
