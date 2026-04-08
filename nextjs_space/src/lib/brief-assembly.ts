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
  const contactIds = card.contacts.map(c => c.contact.id);
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
      checklist: card.checklist.map(c => ({ text: c.text, completed: c.completed })),
    },
    linkedContacts: card.contacts.map(cc => ({
      id: cc.contact.id,
      name: cc.contact.name,
      email: cc.contact.email,
      company: cc.contact.company,
      role: cc.contact.role,
      cardRole: cc.role,
      tags: cc.contact.tags,
    })),
    recentRelays: recentRelays.map(r => ({
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
    recentActivity: recentActivity.map(a => ({
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
 */
export async function findSkillMatches(
  userId: string,
  requiredSkills: string[],
  requiredTaskTypes: string[],
): Promise<SkillMatch[]> {
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

    const reasons: string[] = [];
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
