/**
 * NOW Engine — Dynamic scoring and ranking for the NOW panel.
 * Scores items by: deadline proximity, goal impact, calendar awareness, relay urgency.
 * Returns a unified ranked list of "what to do right now".
 */

interface QueueItemInput {
  id: string;
  type: string;
  title: string;
  priority: string;
  status: string;
  source?: string | null;
  projectId?: string | null;
  metadata?: string | null;
  createdAt: Date;
}

interface GoalInput {
  id: string;
  title: string;
  timeframe: string;
  deadline: Date | null;
  impact: string;
  status: string;
  progress: number;
  projectId?: string | null;
  subGoals?: { id: string; title: string; status: string; progress: number }[];
}

interface KanbanCardInput {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  projectId?: string | null;
}

interface CalendarEventInput {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date | null;
}

interface RelayInput {
  id: string;
  type: string;
  subject: string;
  status: string;
  fromUserId: string;
  toUserId: string | null;
  updatedAt: Date;
}

export interface NowItem {
  id: string;
  type: 'queue' | 'goal_deadline' | 'kanban_due' | 'relay_response' | 'calendar_prep' | 'goal_check' | 'checklist_task';
  title: string;
  subtitle?: string;
  score: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  sourceId: string;
  meta?: Record<string, any>;
}

export interface NowEngineOutput {
  items: NowItem[];
  calendarGaps: { start: Date; end: Date; minutes: number }[];
  activeGoalsSummary: { total: number; critical: number; approaching: number; onTrack: number };
  focusSuggestion: string | null;
}

interface ChecklistTaskInput {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  dueDate: Date | null;
  assigneeType: string;
  cardId: string;
  cardTitle?: string;
}

interface NowEngineInput {
  queueItems: QueueItemInput[];
  goals: GoalInput[];
  kanbanCards: KanbanCardInput[];
  calendarEvents: CalendarEventInput[];
  relays: RelayInput[];
  checklistTasks?: ChecklistTaskInput[];
  userId: string;
  now: Date;
}

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 40, high: 25, medium: 12, low: 5 };
const IMPACT_WEIGHT: Record<string, number> = { critical: 50, high: 35, medium: 18, low: 8 };
const TIMEFRAME_URGENCY: Record<string, number> = { week: 30, month: 15, quarter: 8, year: 3 };

function hoursUntil(target: Date, now: Date): number {
  return (target.getTime() - now.getTime()) / (1000 * 60 * 60);
}

function deadlineScore(deadline: Date | null, now: Date): number {
  if (!deadline) return 0;
  const hours = hoursUntil(deadline, now);
  if (hours < 0) return 60; // Overdue — max urgency
  if (hours < 4) return 50;
  if (hours < 12) return 40;
  if (hours < 24) return 30;
  if (hours < 48) return 20;
  if (hours < 168) return 10; // Within a week
  return 3;
}

function urgencyFromScore(score: number): NowItem['urgency'] {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

/**
 * Find gaps between calendar events where work can happen.
 */
function findCalendarGaps(events: CalendarEventInput[], now: Date): NowEngineOutput['calendarGaps'] {
  if (events.length === 0) return [{ start: now, end: new Date(now.getTime() + 8 * 3600000), minutes: 480 }];

  const gaps: NowEngineOutput['calendarGaps'] = [];
  const sorted = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Gap from now to first event
  const firstStart = new Date(sorted[0].startTime);
  if (firstStart.getTime() > now.getTime()) {
    const mins = (firstStart.getTime() - now.getTime()) / 60000;
    if (mins >= 15) gaps.push({ start: now, end: firstStart, minutes: Math.round(mins) });
  }

  // Gaps between events
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = sorted[i].endTime ? new Date(sorted[i].endTime!) : new Date(new Date(sorted[i].startTime).getTime() + 3600000);
    const nextStart = new Date(sorted[i + 1].startTime);
    const mins = (nextStart.getTime() - currentEnd.getTime()) / 60000;
    if (mins >= 15) gaps.push({ start: currentEnd, end: nextStart, minutes: Math.round(mins) });
  }

  // Gap after last event (assume day ends 8 hours from now)
  const lastEvent = sorted[sorted.length - 1];
  const lastEnd = lastEvent.endTime ? new Date(lastEvent.endTime) : new Date(new Date(lastEvent.startTime).getTime() + 3600000);
  const dayEnd = new Date(now.getTime() + 8 * 3600000);
  if (lastEnd.getTime() < dayEnd.getTime()) {
    const mins = (dayEnd.getTime() - lastEnd.getTime()) / 60000;
    if (mins >= 15) gaps.push({ start: lastEnd, end: dayEnd, minutes: Math.round(mins) });
  }

  return gaps;
}

export function scoreAndRankNow(input: NowEngineInput): NowEngineOutput {
  const { queueItems, goals, kanbanCards, calendarEvents, relays, userId, now } = input;
  const items: NowItem[] = [];

  // ─── Score Queue Items ────────────────────────────────────────────────
  for (const q of queueItems) {
    let score = PRIORITY_WEIGHT[q.priority] || 12;
    if (q.status === 'in_progress') score += 30; // Already active gets boost
    if (q.status === 'blocked') score += 5; // Blocked items lower but visible
    if (q.type === 'agent_suggestion') score += 3; // Slight nudge for agent suggestions

    // Boost if linked to high-impact goal
    if (q.projectId) {
      const linkedGoal = goals.find(g => g.projectId === q.projectId);
      if (linkedGoal) score += (IMPACT_WEIGHT[linkedGoal.impact] || 0) * 0.5;
    }

    // Parse metadata for onboarding flags
    let parsedMeta: Record<string, any> = {};
    if (q.metadata) {
      try { parsedMeta = JSON.parse(q.metadata); } catch {}
    }

    items.push({
      id: `queue_${q.id}`,
      type: 'queue',
      title: q.title,
      subtitle: q.status === 'in_progress' ? 'In Progress' : q.status === 'blocked' ? 'Blocked' : undefined,
      score,
      urgency: urgencyFromScore(score),
      sourceId: q.id,
      meta: { priority: q.priority, status: q.status, queueType: q.type, ...(parsedMeta.onboarding ? { onboarding: true, stepKey: parsedMeta.stepKey, order: parsedMeta.order } : {}) },
    });
  }

  // ─── Score Goals with approaching deadlines ───────────────────────────
  let criticalGoals = 0;
  let approachingGoals = 0;
  let onTrackGoals = 0;

  for (const g of goals) {
    const dlScore = deadlineScore(g.deadline, now);
    const impactScore = IMPACT_WEIGHT[g.impact] || 18;
    const timeframeScore = TIMEFRAME_URGENCY[g.timeframe] || 8;
    const progressPenalty = g.progress > 80 ? -10 : g.progress < 20 ? 10 : 0; // Stalled goals get boost
    const totalScore = dlScore + impactScore * 0.6 + timeframeScore + progressPenalty;

    if (totalScore >= 60) criticalGoals++;
    else if (dlScore >= 20) approachingGoals++;
    else onTrackGoals++;

    // Only surface goals that need attention (deadline approaching or high impact + stalled)
    if (dlScore >= 20 || (impactScore >= 35 && g.progress < 30)) {
      const hoursLeft = g.deadline ? hoursUntil(g.deadline, now) : null;
      items.push({
        id: `goal_${g.id}`,
        type: 'goal_deadline',
        title: g.title,
        subtitle: hoursLeft !== null
          ? hoursLeft < 0 ? 'Overdue!' : `${Math.round(hoursLeft)}h left`
          : `${g.progress}% — needs push`,
        score: totalScore,
        urgency: urgencyFromScore(totalScore),
        sourceId: g.id,
        meta: { impact: g.impact, timeframe: g.timeframe, progress: g.progress, deadline: g.deadline },
      });
    }
  }

  // ─── Score Kanban Cards with due dates ─────────────────────────────────
  for (const card of kanbanCards) {
    if (!card.dueDate) continue; // Only surface cards with deadlines
    const dlScore = deadlineScore(card.dueDate, now);
    if (dlScore < 20) continue; // Only show if within 48h
    const prioScore = PRIORITY_WEIGHT[card.priority] || 12;
    const totalScore = dlScore + prioScore * 0.5;

    items.push({
      id: `kanban_${card.id}`,
      type: 'kanban_due',
      title: card.title,
      subtitle: `Board: ${card.status}`,
      score: totalScore,
      urgency: urgencyFromScore(totalScore),
      sourceId: card.id,
      meta: { status: card.status, priority: card.priority, dueDate: card.dueDate },
    });
  }

  // ─── Score Checklist Tasks (individual tasks from cards) ────────────────
  const checklistTasks = input.checklistTasks || [];
  for (const task of checklistTasks) {
    if (task.completed) continue;
    if (task.assigneeType !== 'self') continue; // Only operator-assigned tasks

    let taskScore = 30; // Base score for incomplete tasks
    if (task.dueDate) {
      const dlScore = deadlineScore(task.dueDate, now);
      taskScore = Math.max(taskScore, dlScore);
    }
    // Earlier tasks in the checklist get higher priority
    taskScore += Math.max(0, 10 - task.order * 2);

    items.push({
      id: `task_${task.id}`,
      type: 'checklist_task',
      title: task.text,
      subtitle: task.cardTitle ? `Card: ${task.cardTitle}` : undefined,
      score: taskScore,
      urgency: urgencyFromScore(taskScore),
      sourceId: task.id,
      meta: { cardId: task.cardId, cardTitle: task.cardTitle, order: task.order, dueDate: task.dueDate },
    });
  }

  // ─── Score Relay Responses (unblock signals) ──────────────────────────
  for (const r of relays) {
    if (r.status !== 'completed') continue;
    const isIncoming = r.toUserId === userId;
    if (!isIncoming) continue; // Only show relays that were sent to us and got responded

    const hoursSinceUpdate = hoursUntil(now, new Date(r.updatedAt));
    const freshnessScore = hoursSinceUpdate < 1 ? 35 : hoursSinceUpdate < 4 ? 25 : hoursSinceUpdate < 24 ? 15 : 5;

    items.push({
      id: `relay_${r.id}`,
      type: 'relay_response',
      title: r.subject,
      subtitle: 'Response received — review & unblock',
      score: freshnessScore + 15, // Relay responses always get a nudge
      urgency: urgencyFromScore(freshnessScore + 15),
      sourceId: r.id,
      meta: { relayType: r.type },
    });
  }

  // ─── Calendar Prep Items ──────────────────────────────────────────────
  for (const ev of calendarEvents) {
    const hoursAway = hoursUntil(new Date(ev.startTime), now);
    if (hoursAway > 0 && hoursAway < 1) {
      items.push({
        id: `cal_${ev.id}`,
        type: 'calendar_prep',
        title: `Prep: ${ev.title}`,
        subtitle: `In ${Math.round(hoursAway * 60)}min`,
        score: 55,
        urgency: 'high',
        sourceId: ev.id,
        meta: { startTime: ev.startTime },
      });
    }
  }

  // ─── Calendar-Queue Correlation ────────────────────────────────────────
  // Boost queue items whose title/metadata mention an upcoming calendar event (within 60min)
  const upcomingEvents = calendarEvents.filter(ev => {
    const h = hoursUntil(new Date(ev.startTime), now);
    return h > 0 && h <= 1;
  });
  if (upcomingEvents.length > 0) {
    for (const item of items) {
      if (item.type !== 'queue') continue;
      const titleLower = item.title.toLowerCase();
      for (const ev of upcomingEvents) {
        // Extract keywords from event title (words > 3 chars)
        const keywords = ev.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const match = keywords.some(kw => titleLower.includes(kw));
        if (match) {
          item.score += 25; // Significant boost for meeting-related queue items
          item.urgency = urgencyFromScore(item.score);
          item.subtitle = `Related to upcoming: ${ev.title}`;
          item.meta = { ...item.meta, calendarCorrelation: ev.id };
          break; // One match is enough
        }
      }
    }
  }

  // ─── Sort by score descending ─────────────────────────────────────────
  items.sort((a, b) => b.score - a.score);

  // ─── Calendar Gaps ────────────────────────────────────────────────────
  const calendarGaps = findCalendarGaps(calendarEvents, now);

  // ─── Focus Suggestion ─────────────────────────────────────────────────
  let focusSuggestion: string | null = null;
  const topItem = items[0];
  if (topItem) {
    const nextGap = calendarGaps[0];
    const gapMinutes = nextGap?.minutes ?? 0;
    if (topItem.urgency === 'critical') {
      focusSuggestion = `🔴 ${topItem.title} needs immediate attention.`;
    } else if (gapMinutes >= 60 && topItem.score >= 30) {
      focusSuggestion = `You have ${gapMinutes}min free — tackle "${topItem.title}".`;
    } else if (gapMinutes >= 30) {
      focusSuggestion = `${gapMinutes}min gap — quick win: "${topItem.title}".`;
    }
  } else if (calendarGaps.length > 0 && calendarGaps[0].minutes >= 60) {
    focusSuggestion = `Clear schedule — ${calendarGaps[0].minutes}min of deep work available.`;
  }

  return {
    items: items.slice(0, 20), // Cap at 20 items
    calendarGaps,
    activeGoalsSummary: {
      total: goals.length,
      critical: criticalGoals,
      approaching: approachingGoals,
      onTrack: onTrackGoals,
    },
    focusSuggestion,
  };
}
