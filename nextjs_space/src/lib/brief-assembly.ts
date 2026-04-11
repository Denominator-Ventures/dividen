/**
 * DiviDen Brief Assembly Engine
 * 
 * Reads a Kanban card's full context graph — linked contacts, pipeline stage,
 * checklist state, recent activity, relay history — and assembles a structured
 * Markdown brief that serves as the "reasoning receipt" for any agent action.
 * 
 * This is the provenance layer. Every orchestrated action generates a brief
 * so humans can always verify agent reasoning.
 */

import { prisma } from './prisma';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BriefContext {
  card: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assignee: string;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    checklist: Array<{ text: string; completed: boolean }>;
  };
  linkedContacts: Array<{
    id: string;
    name: string;
    email: string | null;
    company: string | null;
    role: string | null;
    cardRole: string | null;
    tags: string | null;
  }>;
  recentRelays: Array<{
    id: string;
    subject: string;
    intent: string;
    status: string;
    direction: string;
    fromName: string | null;
    toName: string | null;
    createdAt: Date;
    responsePayload: string | null;
  }>;
  recentActivity: Array<{
    action: string;
    summary: string;
    actor: string;
    createdAt: Date;
  }>;
  ownerProfile: {
    name: string | null;
    taskTypes: string[];
    skills: string[];
    capacity: string;
  } | null;
}

export interface SkillMatch {
  userId: string;
  userName: string | null;
  userEmail: string;
  connectionId: string;
  matchedSkills: string[];
  matchedTaskTypes: string[];
  capacity: string;
  score: number;
  reasoning: string;
}

export interface AssembledBrief {
  markdown: string;
  context: BriefContext;
  suggestedTasks: Array<{
    title: string;
    description: string;
    requiredSkills: string[];
    intent: string;
    priority: string;
  }>;
  skillMatches: SkillMatch[];
}

// ─── Context Assembly ────────────────────────────────────────────────────────

/**
 * Assembles the full context graph for a Kanban card.
 */
export async function assembleCardContext(
  cardId: string,
  userId: string,
): Promise<BriefContext | null> {
  const card = await prisma.kanbanCard.findFirst({
    where: { id: cardId, userId },
    include: {
      checklist: { orderBy: { order: 'asc' } },
      contacts: {
        include: {
          contact: {
            select: { id: true, name: true, email: true, company: true, role: true, tags: true },
          },
        },
      },
    },
  });

  if (!card) return null;

  // Get recent relays mentioning contacts linked to this card
  const contactIds = card.contacts.map((c: any) => c.contact.id);
  const recentRelays = await prisma.agentRelay.findMany({
    where: {
      OR: [
        { fromUserId: userId },
        { toUserId: userId },
      ],
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    include: {
      fromUser: { select: { name: true } },
      toUser: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Get recent activity related to this card
  const recentActivity = await prisma.activityLog.findMany({
    where: {
      userId,
      metadata: { contains: cardId },
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Get owner's profile
  const ownerProfile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      user: { select: { name: true } },
      taskTypes: true,
      skills: true,
      capacity: true,
    },
  });

  const parseJson = (v: string | null, fallback: any = []) => {
    if (!v) return fallback;
    try { return JSON.parse(v); } catch { return fallback; }
  };

  return {
    card: {
      id: card.id,
      title: card.title,
      description: card.description,
      status: card.status,
      priority: card.priority,
      assignee: card.assignee,
      dueDate: card.dueDate,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      checklist: card.checklist.map((c: any) => ({ text: c.text, completed: c.completed })),
    },
    linkedContacts: card.contacts.map((c: any) => ({
      id: c.contact.id,
      name: c.contact.name,
      email: c.contact.email,
      company: c.contact.company,
      role: c.contact.role,
      cardRole: c.role,
      tags: c.contact.tags,
    })),
    recentRelays: recentRelays.map((r: any) => ({
      id: r.id,
      subject: r.subject,
      intent: r.intent,
      status: r.status,
      direction: r.direction,
      fromName: r.fromUser?.name || null,
      toName: r.toUser?.name || null,
      createdAt: r.createdAt,
      responsePayload: r.responsePayload,
    })),
    recentActivity: recentActivity.map((a: any) => ({
      action: a.action,
      summary: a.summary,
      actor: a.actor,
      createdAt: a.createdAt,
    })),
    ownerProfile: ownerProfile
      ? {
          name: ownerProfile.user?.name || null,
          taskTypes: parseJson(ownerProfile.taskTypes),
          skills: parseJson(ownerProfile.skills),
          capacity: ownerProfile.capacity,
        }
      : null,
  };
}

// ─── Skill Matching ──────────────────────────────────────────────────────────

/**
 * Find connections whose profiles match the required skills/task types.
 * When teamId/projectId is provided, members of that scope get a ranking boost
 * so the routing engine prefers team/project members first.
 */
export async function findSkillMatches(
  userId: string,
  requiredSkills: string[],
  requiredTaskTypes: string[],
  options?: { teamId?: string; projectId?: string },
): Promise<SkillMatch[]> {
  // Build set of connection IDs that belong to the team/project scope for scoring boost
  const scopedConnectionIds = new Set<string>();
  const projectConnectionIds = new Set<string>();
  const teamConnectionIds = new Set<string>();

  if (options?.projectId) {
    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId: options.projectId },
      select: { connectionId: true },
    });
    projectMembers.forEach((m: any) => { if (m.connectionId) { projectConnectionIds.add(m.connectionId); scopedConnectionIds.add(m.connectionId); } });
  }

  if (options?.teamId) {
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: options.teamId },
      select: { connectionId: true },
    });
    teamMembers.forEach((m: any) => { if (m.connectionId) { teamConnectionIds.add(m.connectionId); scopedConnectionIds.add(m.connectionId); } });
  } else if (options?.projectId) {
    // If project belongs to a team, also boost team members
    const project = await prisma.project.findUnique({ where: { id: options.projectId }, select: { teamId: true } });
    if (project?.teamId) {
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId: project.teamId },
        select: { connectionId: true },
      });
      teamMembers.forEach((m: any) => { if (m.connectionId) { teamConnectionIds.add(m.connectionId); scopedConnectionIds.add(m.connectionId); } });
    }
  }

  // Get all active connections with their profiles
  const connections = await prisma.connection.findMany({
    where: {
      status: 'active',
      OR: [
        { requesterId: userId },
        { accepterId: userId },
      ],
    },
    include: {
      requester: {
        select: { id: true, name: true, email: true, profile: true },
      },
      accepter: {
        select: { id: true, name: true, email: true, profile: true },
      },
    },
  });

  const parseJson = (v: string | null, fallback: any = []) => {
    if (!v) return fallback;
    try { return JSON.parse(v); } catch { return fallback; }
  };

  const matches: SkillMatch[] = [];

  for (const conn of connections) {
    const peer = conn.requesterId === userId ? conn.accepter : conn.requester;
    if (!peer || !peer.profile) continue;

    const peerSkills: string[] = parseJson(peer.profile.skills);
    const peerTaskTypes: string[] = parseJson(peer.profile.taskTypes);
    const peerCapacity = peer.profile.capacity || 'available';

    // Check relay preferences
    const relayMode = peer.profile.relayMode || 'full';
    if (relayMode === 'off') continue;

    // Match skills
    const normalizedRequired = requiredSkills.map(s => s.toLowerCase());
    const normalizedTaskTypes = requiredTaskTypes.map(t => t.toLowerCase());
    const matchedSkills = peerSkills.filter(s =>
      normalizedRequired.some(r => s.toLowerCase().includes(r) || r.includes(s.toLowerCase()))
    );
    const matchedTaskTypes = peerTaskTypes.filter(t =>
      normalizedTaskTypes.some(r => t.toLowerCase().includes(r) || r.includes(t.toLowerCase()))
    );

    if (matchedSkills.length === 0 && matchedTaskTypes.length === 0) continue;

    // Score: taskType match = 3pts, skill match = 2pts, capacity bonus
    let score = matchedTaskTypes.length * 3 + matchedSkills.length * 2;
    if (peerCapacity === 'available') score += 2;
    else if (peerCapacity === 'limited') score += 1;
    else if (peerCapacity === 'busy' || peerCapacity === 'unavailable') score -= 2;

    // Team/Project scope boost — project members get +10, team members get +5
    if (projectConnectionIds.has(conn.id)) score += 10;
    else if (teamConnectionIds.has(conn.id)) score += 5;

    const reasons: string[] = [];
    if (projectConnectionIds.has(conn.id)) reasons.push('project member');
    if (teamConnectionIds.has(conn.id)) reasons.push('team member');
    if (matchedTaskTypes.length > 0) reasons.push(`task types: ${matchedTaskTypes.join(', ')}`);
    if (matchedSkills.length > 0) reasons.push(`skills: ${matchedSkills.join(', ')}`);
    reasons.push(`capacity: ${peerCapacity}`);

    matches.push({
      userId: peer.id,
      userName: peer.name,
      userEmail: peer.email,
      connectionId: conn.id,
      matchedSkills,
      matchedTaskTypes,
      capacity: peerCapacity,
      score,
      reasoning: reasons.join(' | '),
    });
  }

  return matches.sort((a, b) => b.score - a.score);
}

// ─── Project Context Assembly ─────────────────────────────────────────────────

/**
 * Assembles a cross-member project dashboard that Divi uses when any member
 * asks about a project. Shows every member's active cards, queue items,
 * relay status, and blockers — giving Divi simultaneous awareness.
 */
export interface ProjectContext {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    visibility: string;
    color: string | null;
    teamName: string | null;
  };
  members: Array<{
    name: string | null;
    email: string | null;
    role: string;
    isFederated: boolean;
    instanceUrl: string | null;
    cards: Array<{ id: string; title: string; status: string; priority: string; assignee: string; dueDate: Date | null }>;
    queueItems: Array<{ id: string; title: string; status: string; priority: string }>;
    activeRelays: Array<{ id: string; subject: string; intent: string; status: string; direction: string }>;
  }>;
  summary: {
    totalCards: number;
    totalQueue: number;
    totalRelays: number;
    cardsByStatus: Record<string, number>;
    blockedMembers: string[];
  };
}

export async function assembleProjectContext(
  projectId: string,
  requestingUserId: string,
): Promise<ProjectContext | null> {
  // Fetch project with members
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { members: { some: { userId: requestingUserId } } },
        { createdById: requestingUserId },
        // team visibility: any team member can see
        { visibility: 'team', team: { members: { some: { userId: requestingUserId } } } },
      ],
    },
    include: {
      team: { select: { name: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true, isFederated: true } },
        },
      },
    },
  });

  if (!project) return null;

  // Get all local member userIds for querying their project-scoped data
  const localMemberUserIds = project.members
    .filter((m: any) => m.userId)
    .map((m: any) => m.userId!);

  // Fetch project-scoped cards, queue items, and relays
  const [cards, queueItems, relays] = await Promise.all([
    prisma.kanbanCard.findMany({
      where: { projectId },
      select: { id: true, title: true, status: true, priority: true, assignee: true, dueDate: true, userId: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.queueItem.findMany({
      where: { projectId },
      select: { id: true, title: true, status: true, priority: true, userId: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.agentRelay.findMany({
      where: { projectId },
      select: { id: true, subject: true, intent: true, status: true, direction: true, fromUserId: true, toUserId: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ]);

  // Build per-member views
  const cardsByStatus: Record<string, number> = {};
  const blockedMembers: string[] = [];

  const memberViews = project.members.map((m: any) => {
    const uid = m.userId;
    const isFed = !!m.connection?.isFederated;
    const name = m.user?.name || m.connection?.peerUserName || null;
    const email = m.user?.email || m.connection?.peerUserEmail || null;

    // Filter cards belonging to this member
    const memberCards = uid ? cards.filter((c: any) => c.userId === uid) : [];
    const memberQueue = uid ? queueItems.filter((q: any) => q.userId === uid) : [];
    const memberRelays = uid ? relays.filter((r: any) => r.fromUserId === uid || r.toUserId === uid) : [];

    // Aggregate card statuses
    memberCards.forEach((c: any) => {
      cardsByStatus[c.status] = (cardsByStatus[c.status] || 0) + 1;
    });

    // Detect blocked members (have stale pending queue items or no activity)
    const hasBlockedQueue = memberQueue.some((q: any) => q.status === 'pending' || q.status === 'blocked');
    if (hasBlockedQueue && name) blockedMembers.push(name);

    return {
      name,
      email,
      role: m.role,
      isFederated: isFed,
      instanceUrl: m.connection?.peerInstanceUrl || null,
      cards: memberCards.map((c: any) => ({ id: c.id, title: c.title, status: c.status, priority: c.priority, assignee: c.assignee, dueDate: c.dueDate })),
      queueItems: memberQueue.map((q: any) => ({ id: q.id, title: q.title, status: q.status, priority: q.priority })),
      activeRelays: memberRelays.map((r: any) => ({
        id: r.id, subject: r.subject, intent: r.intent, status: r.status,
        direction: r.fromUserId === uid ? 'outbound' : 'inbound',
      })),
    };
  });

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      visibility: project.visibility,
      color: project.color,
      teamName: project.team?.name || null,
    },
    members: memberViews,
    summary: {
      totalCards: cards.length,
      totalQueue: queueItems.length,
      totalRelays: relays.length,
      cardsByStatus,
      blockedMembers,
    },
  };
}

/**
 * Generates a Markdown project dashboard for Divi's system prompt.
 */
export function generateProjectDashboardMarkdown(ctx: ProjectContext): string {
  const lines: string[] = [];
  lines.push(`### 📋 Project: ${ctx.project.name}`);
  lines.push(`Status: ${ctx.project.status} | Visibility: ${ctx.project.visibility}${ctx.project.teamName ? ` | Team: ${ctx.project.teamName}` : ''}`);
  if (ctx.project.description) lines.push(`> ${ctx.project.description}`);
  lines.push('');

  // Summary
  lines.push(`**Overview:** ${ctx.summary.totalCards} cards, ${ctx.summary.totalQueue} queue items, ${ctx.summary.totalRelays} relays`);
  if (Object.keys(ctx.summary.cardsByStatus).length > 0) {
    const statusStr = Object.entries(ctx.summary.cardsByStatus).map(([k, v]) => `${k}: ${v}`).join(', ');
    lines.push(`**Cards by stage:** ${statusStr}`);
  }
  if (ctx.summary.blockedMembers.length > 0) {
    lines.push(`**⚠️ Potentially blocked:** ${ctx.summary.blockedMembers.join(', ')}`);
  }
  lines.push('');

  // Per-member breakdown
  lines.push('**Member Activity:**');
  for (const m of ctx.members) {
    const fedLabel = m.isFederated ? ` [${m.instanceUrl}]` : '';
    const label = m.name || m.email || 'Unknown';
    lines.push(`- **${label}** (${m.role})${fedLabel}:`);
    if (m.cards.length > 0) {
      lines.push(`  Cards: ${m.cards.map(c => `"${c.title}" [${c.status}${c.priority !== 'normal' ? '/' + c.priority : ''}]`).join(', ')}`);
    }
    if (m.queueItems.length > 0) {
      lines.push(`  Queue: ${m.queueItems.map(q => `"${q.title}" [${q.status}]`).join(', ')}`);
    }
    if (m.activeRelays.length > 0) {
      lines.push(`  Relays: ${m.activeRelays.map(r => `${r.direction === 'inbound' ? '📥' : '📤'} "${r.subject}" [${r.status}]`).join(', ')}`);
    }
    if (m.cards.length === 0 && m.queueItems.length === 0 && m.activeRelays.length === 0) {
      lines.push(`  No active items`);
    }
  }

  return lines.join('\n');
}

// ─── Brief Markdown Generation ───────────────────────────────────────────────

/**
 * Generates the full Markdown brief from assembled context.
 */
export function generateBriefMarkdown(
  context: BriefContext,
  suggestedTasks: AssembledBrief['suggestedTasks'],
  skillMatches: SkillMatch[],
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Brief: ${context.card.title}`);
  lines.push(``);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Card Status:** ${context.card.status} | **Priority:** ${context.card.priority} | **Assignee:** ${context.card.assignee}`);
  if (context.card.dueDate) {
    lines.push(`**Due:** ${context.card.dueDate.toISOString().split('T')[0]}`);
  }
  lines.push(``);

  // Description
  if (context.card.description) {
    lines.push(`## Project Context`);
    lines.push(context.card.description);
    lines.push(``);
  }

  // Checklist
  if (context.card.checklist.length > 0) {
    lines.push(`## Checklist`);
    for (const item of context.card.checklist) {
      lines.push(`- [${item.completed ? 'x' : ' '}] ${item.text}`);
    }
    lines.push(``);
  }

  // Linked Contacts
  if (context.linkedContacts.length > 0) {
    lines.push(`## People Involved`);
    for (const c of context.linkedContacts) {
      const parts = [c.name];
      if (c.cardRole) parts.push(`(${c.cardRole})`);
      if (c.company) parts.push(`@ ${c.company}`);
      if (c.role) parts.push(`— ${c.role}`);
      lines.push(`- ${parts.join(' ')}`);
    }
    lines.push(``);
  }

  // Recent Relays
  if (context.recentRelays.length > 0) {
    lines.push(`## Recent Relay Activity (last 7 days)`);
    for (const r of context.recentRelays) {
      const dir = r.direction === 'outbound' ? '→' : '←';
      const names = r.direction === 'outbound' ? r.toName : r.fromName;
      lines.push(`- ${dir} "${r.subject}" (${r.intent}) — ${r.status}${r.responsePayload ? ` — Response: ${r.responsePayload.substring(0, 100)}` : ''}`);
    }
    lines.push(``);
  }

  // Recent Activity
  if (context.recentActivity.length > 0) {
    lines.push(`## Recent Activity`);
    for (const a of context.recentActivity) {
      lines.push(`- [${a.actor}] ${a.summary}`);
    }
    lines.push(``);
  }

  // Suggested Tasks
  if (suggestedTasks.length > 0) {
    lines.push(`## Decomposed Tasks`);
    for (let i = 0; i < suggestedTasks.length; i++) {
      const t = suggestedTasks[i];
      lines.push(`### Task ${i + 1}: ${t.title}`);
      lines.push(t.description);
      lines.push(`- **Required skills:** ${t.requiredSkills.join(', ')}`);
      lines.push(`- **Intent:** ${t.intent}`);
      lines.push(`- **Priority:** ${t.priority}`);
      lines.push(``);
    }
  }

  // Skill Matches
  if (skillMatches.length > 0) {
    lines.push(`## Routing Recommendations`);
    for (const m of skillMatches) {
      lines.push(`- **${m.userName || m.userEmail}** (score: ${m.score}) — ${m.reasoning}`);
    }
    lines.push(``);
  }

  return lines.join('\n');
}

// ─── Store Brief ─────────────────────────────────────────────────────────────

/**
 * Creates an AgentBrief record in the database.
 */
export async function storeBrief(params: {
  userId: string;
  type: string;
  title: string;
  sourceCardId?: string;
  sourceContactIds?: string[];
  sourceRelayId?: string;
  briefMarkdown: string;
  promptUsed?: string;
  matchedUserId?: string;
  matchReasoning?: string;
  matchedSkills?: string[];
  routeType?: string;
  resultRelayId?: string;
  resultAction?: string;
  status?: string;
}) {
  return prisma.agentBrief.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      sourceCardId: params.sourceCardId || null,
      sourceContactIds: params.sourceContactIds ? JSON.stringify(params.sourceContactIds) : null,
      sourceRelayId: params.sourceRelayId || null,
      briefMarkdown: params.briefMarkdown,
      promptUsed: params.promptUsed || null,
      matchedUserId: params.matchedUserId || null,
      matchReasoning: params.matchReasoning || null,
      matchedSkills: params.matchedSkills ? JSON.stringify(params.matchedSkills) : null,
      routeType: params.routeType || null,
      resultRelayId: params.resultRelayId || null,
      resultAction: params.resultAction || null,
      status: params.status || 'assembled',
    },
  });
}


// ─── Federation Intelligence Stubs ────────────────────────────────────────────
// These are invoked by action tags. They return basic data now;
// full federation wire-up will enrich them later.

export async function generateNetworkBriefing(userId: string) {
  const { prisma } = await import('./prisma');
  const connections = await prisma.connection.findMany({
    where: { OR: [{ requesterId: userId }, { accepterId: userId }], status: 'active' },
    include: { requester: { select: { name: true } }, accepter: { select: { name: true } } },
  });
  const recentRelays = await prisma.agentRelay.findMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  return {
    connections: connections.length,
    recentRelays: recentRelays.length,
    summary: `Network pulse: ${connections.length} active connections, ${recentRelays.length} recent relays.`,
  };
}

export async function intelligentTaskRoute(userId: string, task: { description: string; skills: string[]; taskType: string }) {
  const matches = await findSkillMatches(userId, task.skills, [task.taskType]);
  return {
    task: task.description,
    candidates: matches.slice(0, 5).map(m => ({
      name: m.userName,
      score: m.score,
      matchedSkills: m.matchedSkills,
      capacity: m.capacity,
    })),
    recommendation: matches.length > 0
      ? `Best match: ${matches[0].userName} (score: ${matches[0].score})`
      : 'No matching connections found. Consider posting as a network job.',
  };
}