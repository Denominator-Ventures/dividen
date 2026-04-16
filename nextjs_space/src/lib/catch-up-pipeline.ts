/**
 * Catch-Up Data Pipeline — Server-side data assembly for briefings.
 *
 * Following FVP's two-layer architecture:
 * Layer 1: This file — assembles structured briefing data BEFORE the LLM call.
 * Layer 2: Pacing instructions in the system prompt — controls how the LLM
 *          walks the user through the pre-assembled data.
 *
 * The LLM never fetches data itself during catch-up. Everything is pre-built here.
 */

import { prisma } from './prisma';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BriefingPhase {
  id: string;
  name: string;
  icon: string;
  /** Pre-formatted markdown content for this phase */
  content: string;
  /** Number of items in this phase (for running tally) */
  itemCount: number;
  /** Whether this phase has any data worth presenting */
  hasData: boolean;
}

export interface BriefingPayload {
  /** All phases with pre-assembled data */
  phases: BriefingPhase[];
  /** Phases that have data (non-empty) */
  activePhases: BriefingPhase[];
  /** Full markdown briefing context to inject into system prompt */
  briefingContext: string;
  /** Pacing instructions for the LLM */
  pacingPrompt: string;
  /** Timestamp of assembly */
  assembledAt: string;
}

// ─── Data Source Adapters ───────────────────────────────────────────────────

async function assembleQueuePhase(userId: string): Promise<BriefingPhase> {
  const [queueItems, kanbanCards, completedRecently] = await Promise.all([
    prisma.queueItem.findMany({
      where: { userId, status: { in: ['ready', 'in_progress'] } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    }),
    prisma.kanbanCard.findMany({
      where: { userId },
      orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
      take: 30,
      include: {
        checklist: true,
        project: { select: { name: true } },
        _count: {
          select: { emailMessages: true, recordings: true, calendarEvents: true, commsMessages: true, artifacts: true },
        },
      },
    }),
    // Cards completed in last 48h
    prisma.kanbanCard.findMany({
      where: {
        userId,
        status: 'completed',
        updatedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      select: { title: true, updatedAt: true, project: { select: { name: true } } },
      take: 10,
    }),
  ]);

  let content = '';
  let itemCount = 0;

  // Recently completed
  if (completedRecently.length > 0) {
    content += '### ✅ Completed Since Last Check\n';
    for (const c of completedRecently) {
      const proj = c.project?.name ? ` (${c.project.name})` : '';
      content += `- "${c.title}"${proj} — completed ${_relativeTime(c.updatedAt)}\n`;
    }
    content += '\n';
    itemCount += completedRecently.length;
  }

  // Board status by priority
  const byPriority: Record<string, typeof kanbanCards> = {};
  for (const card of kanbanCards.filter(c => c.status !== 'completed')) {
    if (!byPriority[card.priority]) byPriority[card.priority] = [];
    byPriority[card.priority].push(card);
  }

  const activeCards = kanbanCards.filter(c => c.status !== 'completed');
  if (activeCards.length > 0) {
    content += `### 📋 Board Status (${activeCards.length} active projects)\n`;
    const inProgress = activeCards.filter(c => c.status === 'in_progress');
    if (inProgress.length > 0) {
      content += `**In Progress (${inProgress.length}):**\n`;
      for (const c of inProgress) {
        const checks = c.checklist.length > 0
          ? ` — ${c.checklist.filter(x => x.completed).length}/${c.checklist.length} tasks done`
          : '';
        const proj = c.project?.name ? ` [${c.project.name}]` : '';
        const due = c.dueDate ? ` Due: ${c.dueDate.toISOString().split('T')[0]}` : '';
        content += `- 🔴 "${c.title}"${proj} (${c.priority})${checks}${due}\n`;
      }
      content += '\n';
    }
    const urgent = activeCards.filter(c => c.priority === 'urgent' && c.status !== 'in_progress');
    if (urgent.length > 0) {
      content += `**Urgent (${urgent.length}):**\n`;
      for (const c of urgent) {
        content += `- 🔴 "${c.title}" — ${c.status}\n`;
      }
      content += '\n';
    }
    itemCount += activeCards.length;
  }

  // Queue
  if (queueItems.length > 0) {
    content += `### 📥 Queue (${queueItems.length} pending)\n`;
    for (const q of queueItems) {
      const pri = q.priority === 'urgent' ? '🔴' : q.priority === 'high' ? '🟡' : '';
      content += `- ${pri} [${q.type}] "${q.title}" — ${q.source || 'system'}\n`;
    }
    content += '\n';
    itemCount += queueItems.length;
  }

  return {
    id: 'queue',
    name: 'Board & Queue Progress',
    icon: '📋',
    content: content || 'No active projects or queue items.',
    itemCount,
    hasData: itemCount > 0,
  };
}

async function assembleEmailPhase(userId: string): Promise<BriefingPhase> {
  const emails = await prisma.emailMessage.findMany({
    where: { userId, isRead: false },
    orderBy: [{ isStarred: 'desc' }, { receivedAt: 'desc' }],
    take: 25,
    select: {
      id: true, subject: true, fromName: true, fromEmail: true, snippet: true,
      isStarred: true, labels: true, receivedAt: true,
    },
  });

  if (emails.length === 0) {
    return {
      id: 'email',
      name: 'Inbox Triage',
      icon: '📧',
      content: 'Inbox zero — no unread emails.',
      itemCount: 0,
      hasData: false,
    };
  }

  let content = `### 📧 Unread Emails (${emails.length})\n\n`;

  // Group: starred first, then by rough importance
  const starred = emails.filter(e => e.isStarred);
  const unstarred = emails.filter(e => !e.isStarred);

  if (starred.length > 0) {
    content += `**⭐ Starred (${starred.length}):**\n`;
    for (const e of starred) {
      const from = e.fromName || e.fromEmail || 'Unknown';
      const age = e.receivedAt ? _relativeTime(e.receivedAt) : '';
      content += `- From **${from}**: "${e.subject}"${age ? ` — ${age}` : ''}\n`;
      if (e.snippet) content += `  > ${e.snippet.slice(0, 150)}\n`;
    }
    content += '\n';
  }

  if (unstarred.length > 0) {
    content += `**Other Unread (${unstarred.length}):**\n`;
    for (const e of unstarred.slice(0, 15)) {
      const from = e.fromName || e.fromEmail || 'Unknown';
      const age = e.receivedAt ? _relativeTime(e.receivedAt) : '';
      content += `- From **${from}**: "${e.subject}"${age ? ` — ${age}` : ''}\n`;
      if (e.snippet) content += `  > ${e.snippet.slice(0, 120)}\n`;
    }
    if (unstarred.length > 15) {
      content += `- ...and ${unstarred.length - 15} more\n`;
    }
    content += '\n';
  }

  return {
    id: 'email',
    name: 'Inbox Triage',
    icon: '📧',
    content,
    itemCount: emails.length,
    hasData: true,
  };
}

async function assembleCalendarPhase(userId: string): Promise<BriefingPhase> {
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const events = await prisma.calendarEvent.findMany({
    where: { userId, startTime: { gte: now, lte: nextWeek } },
    orderBy: { startTime: 'asc' },
    take: 20,
  });

  if (events.length === 0) {
    return {
      id: 'calendar',
      name: 'Calendar & Schedule',
      icon: '📅',
      content: 'No upcoming events in the next 7 days.',
      itemCount: 0,
      hasData: false,
    };
  }

  let content = `### 📅 Upcoming (${events.length} events, next 7 days)\n\n`;

  // Group by day
  const byDay: Record<string, typeof events> = {};
  for (const e of events) {
    const day = e.startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(e);
  }

  for (const [day, dayEvents] of Object.entries(byDay)) {
    content += `**${day}:**\n`;
    for (const e of dayEvents) {
      const time = e.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const loc = e.location ? ` @ ${e.location}` : '';
      let attendeeCount = 0;
      try { const a = JSON.parse(e.attendees || '[]'); attendeeCount = a.length; } catch {}
      const att = attendeeCount > 0 ? ` (${attendeeCount} attendees)` : '';
      content += `- ${time}: "${e.title}"${loc}${att}\n`;
    }
    content += '\n';
  }

  return {
    id: 'calendar',
    name: 'Calendar & Schedule',
    icon: '📅',
    content,
    itemCount: events.length,
    hasData: true,
  };
}

async function assembleRecordingsPhase(userId: string): Promise<BriefingPhase> {
  const recordings = await prisma.recording.findMany({
    where: { userId, status: { in: ['pending', 'processed'] } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { card: { select: { title: true } } },
  });

  const unreviewed = recordings.filter(r => r.status !== 'reviewed');
  if (unreviewed.length === 0) {
    return {
      id: 'recordings',
      name: 'Recordings & Transcripts',
      icon: '🎙️',
      content: 'No unreviewed recordings.',
      itemCount: 0,
      hasData: false,
    };
  }

  let content = `### 🎙️ Unreviewed Recordings (${unreviewed.length})\n\n`;
  for (const r of unreviewed) {
    const dur = r.duration ? ` (${Math.round(r.duration / 60)}min)` : '';
    const linked = r.card ? ` → linked to "${r.card.title}"` : '';
    content += `- "${r.title}" (${r.source})${dur}${linked}\n`;
    if (r.summary) content += `  Summary: ${r.summary.slice(0, 200)}\n`;
  }
  content += '\n';

  return {
    id: 'recordings',
    name: 'Recordings & Transcripts',
    icon: '🎙️',
    content,
    itemCount: unreviewed.length,
    hasData: true,
  };
}

async function assembleFederationPhase(userId: string): Promise<BriefingPhase> {
  const [activeRelays, recentResponses] = await Promise.all([
    prisma.agentRelay.findMany({
      where: {
        OR: [
          { toUserId: userId, status: { in: ['delivered', 'user_review'] } },
          { fromUserId: userId, status: { in: ['pending', 'delivered', 'agent_handling'] } },
        ],
      },
      include: {
        fromUser: { select: { name: true, email: true } },
        toUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.agentRelay.findMany({
      where: {
        fromUserId: userId,
        status: 'completed',
        resolvedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      include: { toUser: { select: { name: true } } },
      orderBy: { resolvedAt: 'desc' },
      take: 5,
    }),
  ]);

  const totalItems = activeRelays.length + recentResponses.length;
  if (totalItems === 0) {
    return {
      id: 'federation',
      name: 'Network & Relays',
      icon: '🌐',
      content: 'No active relays or recent responses.',
      itemCount: 0,
      hasData: false,
    };
  }

  let content = '';

  if (recentResponses.length > 0) {
    content += `### 📬 Relay Responses (last 48h)\n`;
    for (const r of recentResponses) {
      const name = r.toUser?.name || 'A connection';
      content += `- **${name}** responded to "${r.subject}": ${r.responsePayload || '[acknowledged]'}\n`;
    }
    content += '\n';
  }

  if (activeRelays.length > 0) {
    const inbound = activeRelays.filter(r => r.toUserId === userId);
    const outbound = activeRelays.filter(r => r.fromUserId === userId);
    if (inbound.length > 0) {
      content += `### 📥 Inbound Relays (${inbound.length})\n`;
      for (const r of inbound) {
        const from = r.fromUser?.name || r.fromUser?.email || 'Unknown';
        content += `- From **${from}**: "${r.subject}" (${r.intent}) — ${r.status}\n`;
      }
      content += '\n';
    }
    if (outbound.length > 0) {
      content += `### 📤 Outbound Relays (${outbound.length})\n`;
      for (const r of outbound) {
        const to = r.toUser?.name || r.toUser?.email || 'Unknown';
        content += `- To **${to}**: "${r.subject}" — ${r.status}\n`;
      }
      content += '\n';
    }
  }

  return {
    id: 'federation',
    name: 'Network & Relays',
    icon: '🌐',
    content,
    itemCount: totalItems,
    hasData: true,
  };
}

async function assembleNowPhase(userId: string): Promise<BriefingPhase> {
  // Assigned checklist tasks due soon
  const myTasks = await prisma.checklistItem.findMany({
    where: {
      completed: false,
      assigneeType: 'self',
      card: { userId, status: { in: ['active', 'in_progress', 'development'] } },
    },
    orderBy: [{ dueDate: 'asc' }, { order: 'asc' }],
    take: 10,
    include: {
      card: { select: { title: true, priority: true, project: { select: { name: true } } } },
    },
  });

  if (myTasks.length === 0) {
    return {
      id: 'now',
      name: 'Recommended Focus',
      icon: '🎯',
      content: 'No assigned tasks. Consider running a triage or reviewing your board.',
      itemCount: 0,
      hasData: false,
    };
  }

  let content = `### 🎯 Your NOW List (${myTasks.length} tasks)\n\n`;
  for (const t of myTasks) {
    const due = t.dueDate ? ` — Due: ${new Date(t.dueDate).toISOString().split('T')[0]}` : '';
    const proj = t.card?.project?.name ? ` [${t.card.project.name}]` : '';
    const pri = t.card?.priority === 'urgent' ? '🔴' : t.card?.priority === 'high' ? '🟡' : '';
    content += `- ${pri} "${t.text}" on "${t.card?.title}"${proj}${due}\n`;
  }
  content += '\n';

  return {
    id: 'now',
    name: 'Recommended Focus',
    icon: '🎯',
    content,
    itemCount: myTasks.length,
    hasData: true,
  };
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────

/**
 * Assemble the complete catch-up briefing payload.
 * All data is fetched and formatted server-side BEFORE the LLM sees it.
 */
export async function assembleBriefing(userId: string): Promise<BriefingPayload> {
  // Run all data sources in parallel
  const phases = await Promise.all([
    assembleQueuePhase(userId),
    assembleEmailPhase(userId),
    assembleRecordingsPhase(userId),
    assembleCalendarPhase(userId),
    assembleFederationPhase(userId),
    assembleNowPhase(userId),
  ]);

  const activePhases = phases.filter(p => p.hasData);

  // Build the full briefing context markdown
  const phaseList = activePhases.map((p, i) => `${i + 1}. ${p.icon} ${p.name} (${p.itemCount} items)`).join('\n');
  const phaseContents = activePhases.map(p => p.content).join('\n---\n\n');

  const briefingContext = `# ═══ CATCH-UP BRIEFING DATA (pre-assembled) ═══

**Phases with data:** ${activePhases.length} of ${phases.length}
${phaseList}

---

${phaseContents}`;

  // Build pacing prompt
  const pacingPrompt = buildPacingPrompt(activePhases);

  return {
    phases,
    activePhases,
    briefingContext,
    pacingPrompt,
    assembledAt: new Date().toISOString(),
  };
}

// ─── Pacing Instructions ────────────────────────────────────────────────────

function buildPacingPrompt(activePhases: BriefingPhase[]): string {
  if (activePhases.length === 0) {
    return `The user requested a catch-up but there's nothing new to report. Let them know everything is clear and suggest what they could focus on.`;
  }

  const phaseNames = activePhases.map((p, i) => `Phase ${i + 1}: ${p.icon} ${p.name}`).join(', ');

  return `## CATCH-UP PACING INSTRUCTIONS (CRITICAL — follow strictly)

You are delivering a catch-up briefing. ALL the data has been pre-assembled above.
**DO NOT** try to fetch, sync, or look up any additional data. Everything you need is in the briefing.
**DO NOT** make up or hallucinate items not in the briefing data.
**DO** present items using the exact details from the pre-assembled data.

### Phase Order
${activePhases.map((p, i) => `${i + 1}. ${p.icon} **${p.name}** — ${p.itemCount} items`).join('\n')}

### Delivery Rules
1. **Start with a brief overview**: "Here's what's happened — I've got ${activePhases.length} areas to walk you through: ${phaseNames}."
2. **Present ONE phase at a time.** Give a crisp summary of each phase with specifics (names, subjects, counts).
3. **Be opinionated**: Flag what matters vs. what doesn't. Use 🔴 for urgent, 🟡 for important.
4. **End each phase** with your recommendation for that area and ask: "Want to dig into any of these, or move to the next phase?"
5. **After all phases**, close with your top 2-3 "focus NOW" recommendations — the things that move the needle fastest.
6. **Keep running tally**: After each phase, note what's been covered vs. remaining. e.g., "(2 of ${activePhases.length} phases done)"
7. **Don't dump everything at once.** If a phase has many items, highlight the top 3-5 and mention there are more.
8. **Write like a chief of staff briefing**, not a system report. Be direct, specific, and opinionated.
9. **Use the exact data** from the briefing sections above. Reference specific email subjects, card titles, event names by name.`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function _relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
