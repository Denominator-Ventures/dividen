/**
 * DiviDen 13-Layer System Prompt Builder
 * 
 * Dynamically constructs context for the AI agent from database state.
 * Each layer adds a specific dimension of awareness to the prompt.
 */

import { prisma } from './prisma';

interface PromptContext {
  userId: string;
  mode: string;
  userName?: string | null;
}

// ─── Layer Builders ──────────────────────────────────────────────────────────

function layer1_identity(ctx: PromptContext): string {
  const modeName = ctx.mode === 'chief_of_staff' ? 'Chief of Staff' : 'Cockpit';
  const modeDesc =
    ctx.mode === 'chief_of_staff'
      ? `You are operating in Chief of Staff mode. You proactively manage tasks, make decisions, and take action on behalf of ${ctx.userName || 'the user'}. You prioritize, delegate, and execute without waiting for explicit approval on routine matters.`
      : `You are operating in Cockpit mode. You present information, options, and recommendations to ${ctx.userName || 'the user'}, who makes all final decisions. You execute tasks only when explicitly instructed.`;

  return `## Layer 1: Identity
You are DiviDen, a personal command center AI agent for ${ctx.userName || 'the user'}.
Current operating mode: **${modeName}**
${modeDesc}`;
}

async function layer2_rules(): Promise<string> {
  const rules = await prisma.agentRule.findMany({
    where: { enabled: true },
    orderBy: { priority: 'desc' },
  });

  if (rules.length === 0) {
    return `## Layer 2: Rules\nNo custom rules are configured.`;
  }

  const ruleLines = rules
    .map((r, i) => `${i + 1}. **${r.name}**: ${r.rule}`)
    .join('\n');

  return `## Layer 2: Rules\nFollow these rules at all times:\n${ruleLines}`;
}

async function layer3_conversationSummary(userId: string): Promise<string> {
  const recentCount = await prisma.chatMessage.count({
    where: { userId },
  });

  return `## Layer 3: Conversation Context\nTotal messages in this session: ${recentCount}. Maintain continuity with prior context.`;
}

async function layer4_kanbanState(userId: string): Promise<string> {
  const cards = await prisma.kanbanCard.findMany({
    where: { userId },
    orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
    take: 30,
    include: { checklist: true },
  });

  if (cards.length === 0) {
    return `## Layer 4: Kanban State\nNo cards on the board yet.`;
  }

  const byStatus: Record<string, typeof cards> = {};
  for (const card of cards) {
    const s = card.status;
    if (!byStatus[s]) byStatus[s] = [];
    byStatus[s].push(card);
  }

  let text = `## Layer 4: Kanban State (${cards.length} cards)\n`;
  for (const [status, items] of Object.entries(byStatus)) {
    text += `\n### ${status.replace('_', ' ').toUpperCase()} (${items.length})\n`;
    for (const c of items) {
      const due = c.dueDate ? ` | Due: ${c.dueDate.toISOString().split('T')[0]}` : '';
      const checks = c.checklist.length > 0
        ? ` | Checklist: ${c.checklist.filter((x) => x.completed).length}/${c.checklist.length}`
        : '';
      text += `- [${c.id}] "${c.title}" (${c.priority})${due}${checks}\n`;
    }
  }

  return text;
}

async function layer5_queueState(): Promise<string> {
  const items = await prisma.queueItem.findMany({
    where: { status: 'ready' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (items.length === 0) {
    return `## Layer 5: Queue State\nQueue is empty.`;
  }

  const lines = items
    .map((q) => `- [${q.type}] "${q.title}" (${q.priority}) — from ${q.source || 'unknown'}`)
    .join('\n');

  return `## Layer 5: Queue State (${items.length} pending)\n${lines}`;
}

async function layer6_crmSummary(userId: string): Promise<string> {
  const contacts = await prisma.contact.findMany({
    where: { userId },
    take: 30,
    orderBy: { updatedAt: 'desc' },
  });

  if (contacts.length === 0) {
    return `## Layer 6: CRM\nNo contacts stored yet.`;
  }

  const lines = contacts
    .map((c) => {
      const parts = [c.name];
      if (c.company) parts.push(`@ ${c.company}`);
      if (c.role) parts.push(`(${c.role})`);
      if (c.email) parts.push(`<${c.email}>`);
      return `- [${c.id}] ${parts.join(' ')}`;
    })
    .join('\n');

  return `## Layer 6: CRM Contacts (${contacts.length})\n${lines}`;
}

async function layer7_memory(userId: string): Promise<string> {
  // Use the 3-tier memory system
  const { buildMemoryContext } = await import('./memory');
  return buildMemoryContext(userId);
}

async function layer8_recentMessages(userId: string): Promise<string> {
  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (messages.length === 0) {
    return `## Layer 8: Recent Messages\nNo prior messages.`;
  }

  const lines = messages
    .reverse()
    .map((m) => `[${m.role}]: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`)
    .join('\n');

  return `## Layer 8: Recent Messages (last ${messages.length})\n${lines}`;
}

function layer9_currentTime(): string {
  const now = new Date();
  return `## Layer 9: Current Time\n${now.toISOString()} (${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})`;
}

async function layer10_learnings(userId: string): Promise<string> {
  const learnings = await prisma.userLearning.findMany({
    where: { userId },
    orderBy: { confidence: 'desc' },
    take: 20,
  });

  if (learnings.length === 0) {
    return `## Layer 10: User Learnings\nNo learnings yet. Observe the user's style and preferences.`;
  }

  const lines = learnings
    .map((l) => `- [${l.category}] ${l.observation} (confidence: ${l.confidence})`)
    .join('\n');

  return `## Layer 10: User Learnings\n${lines}`;
}

async function layer11_activeFocus(userId: string): Promise<string> {
  // Active focus = in_progress cards, highest priority first
  const focusCards = await prisma.kanbanCard.findMany({
    where: { userId, status: 'in_progress' },
    orderBy: { priority: 'asc' },
    take: 3,
  });

  if (focusCards.length === 0) {
    return `## Layer 11: Active Focus\nNo cards currently in progress. The NOW panel is empty.`;
  }

  const lines = focusCards
    .map((c) => `- "${c.title}" [${c.priority}]${c.dueDate ? ` — Due: ${c.dueDate.toISOString().split('T')[0]}` : ''}`)
    .join('\n');

  return `## Layer 11: Active Focus (NOW Panel)\nCurrently working on:\n${lines}`;
}

function layer12_capabilities(): string {
  return `## Layer 12: System Capabilities
You can perform the following actions by embedding action tags in your responses:
- Create, update, and archive Kanban cards
- Add and complete checklist items on cards
- Create and link contacts (CRM)
- Dispatch items to the user's queue
- Create calendar events and reminders
- Send emails (draft)
- Update your memory about the user
- Save observations about user preferences

Always embed action tags alongside your natural language response. The user will only see the natural language; tags are stripped before display.`;
}

function layer13_actionTagSyntax(): string {
  return `## Layer 13: Action Tag Syntax
Embed these tags in your response to execute actions. Use double brackets: [[tag_name:params]]

### Card Management
- [[create_card:{"title":"...","description":"...","status":"backlog|in_progress|review|done","priority":"low|medium|high|urgent","dueDate":"YYYY-MM-DD"}]]
- [[update_card:{"id":"card_id","title":"...","status":"...","priority":"...","dueDate":"..."}]]
- [[archive_card:{"id":"card_id"}]]

### Checklist
- [[add_checklist:{"cardId":"card_id","text":"Item text"}]]
- [[complete_checklist:{"id":"checklist_item_id","completed":true}]]

### Contacts (CRM)
- [[create_contact:{"name":"...","email":"...","phone":"...","company":"...","role":"...","notes":"...","tags":"tag1,tag2","cardId":"optional_card_to_link"}]]
- [[link_contact:{"cardId":"card_id","contactId":"contact_id","role":"..."}]]
- [[link_contact:{"cardId":"card_id","contactName":"Name","role":"..."}]] — Will find or create contact by name

### Queue
- [[dispatch_queue:{"type":"task|notification|reminder|agent_suggestion","title":"...","description":"...","priority":"low|medium|high|urgent"}]]

### Calendar & Reminders
- [[create_event:{"title":"...","description":"...","date":"YYYY-MM-DD","time":"HH:MM"}]]
- [[set_reminder:{"title":"...","description":"...","date":"YYYY-MM-DD","time":"HH:MM"}]]

### Communication
- [[send_email:{"to":"...","subject":"...","body":"..."}]]

### Memory & Learning (3-Tier System)
- [[update_memory:{"tier":1,"category":"general|project|contact","key":"...","value":"...","scope":"optional scope","pinned":false}]] — Explicit fact
- [[update_memory:{"tier":2,"category":"communication|workflow|preferences","key":"...","value":"...","priority":"critical|high|medium|low"}]] — Behavioral rule
- [[update_memory:{"tier":3,"category":"style|preference|workflow|communication","key":"...","value":"...","confidence":0.0-1.0}]] — Learned pattern
- [[save_learning:{"category":"style|preference|workflow|communication","observation":"...","confidence":0.0-1.0}]] — Shorthand for Tier 3 pattern

IMPORTANT:
- Always include ALL required fields in each tag.
- You may embed multiple tags in a single response.
- Place tags at the end of your response or inline where relevant.
- Tags will be stripped from the displayed message — users never see them.
- If unsure, ask the user before creating/modifying data.`;
}

// ─── Main Builder ────────────────────────────────────────────────────────────

export async function buildSystemPrompt(ctx: PromptContext): Promise<string> {
  const layers = await Promise.all([
    layer1_identity(ctx),
    layer2_rules(),
    layer3_conversationSummary(ctx.userId),
    layer4_kanbanState(ctx.userId),
    layer5_queueState(),
    layer6_crmSummary(ctx.userId),
    layer7_memory(ctx.userId),
    layer8_recentMessages(ctx.userId),
    layer9_currentTime(),
    layer10_learnings(ctx.userId),
    layer11_activeFocus(ctx.userId),
    layer12_capabilities(),
    layer13_actionTagSyntax(),
  ]);

  return layers.join('\n\n---\n\n');
}
