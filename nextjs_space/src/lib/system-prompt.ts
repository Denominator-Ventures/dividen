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
You are Divi, the AI agent inside the DiviDen Command Center, working for ${ctx.userName || 'the user'}.
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

async function layer12_calendarContext(userId: string): Promise<string> {
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      startTime: { gte: now, lte: nextWeek },
    },
    orderBy: { startTime: 'asc' },
    take: 15,
  });

  if (events.length === 0) {
    return `## Layer 12: Calendar\nNo upcoming events in the next 7 days.`;
  }

  const lines = events.map((e) => {
    const day = e.startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const time = e.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const loc = e.location ? ` @ ${e.location}` : '';
    return `- ${day} ${time}: "${e.title}"${loc}`;
  }).join('\n');

  return `## Layer 12: Calendar (next 7 days — ${events.length} events)\n${lines}`;
}

async function layer13_emailContext(userId: string): Promise<string> {
  const unreadCount = await prisma.emailMessage.count({
    where: { userId, isRead: false },
  });

  const recent = await prisma.emailMessage.findMany({
    where: { userId, isRead: false },
    orderBy: { receivedAt: 'desc' },
    take: 5,
  });

  if (unreadCount === 0) {
    return `## Layer 13: Inbox\nNo unread emails.`;
  }

  const lines = recent.map((e) => {
    const starred = e.isStarred ? '⭐ ' : '';
    return `- ${starred}From ${e.fromName || e.fromEmail}: "${e.subject}"`;
  }).join('\n');

  return `## Layer 13: Inbox (${unreadCount} unread)\n${lines}`;
}

function layer14_capabilities(): string {
  return `## Layer 14: System Capabilities
You can perform the following actions by embedding action tags in your responses:
- Create, update, and archive Kanban cards
- Add and complete checklist items on cards
- Create and link contacts (CRM)
- Dispatch items to the user's queue
- Create calendar events directly
- Create documents in Drive
- Send messages to the Comms Channel
- Send emails (draft)
- Set up webhooks for external integrations
- Save API keys for LLM providers
- Update your memory about the user
- Save observations about user preferences

Always embed action tags alongside your natural language response. The user will only see the natural language; tags are stripped before display.`;
}

function layer15_actionTagSyntax(): string {
  return `## Layer 15: Action Tag Syntax
Embed these tags in your response to execute actions. Use double brackets: [[tag_name:params]]

### Card Management
- [[create_card:{"title":"...","description":"...","status":"leads|qualifying|proposal|negotiation|contracted|active|development|planning|paused|completed","priority":"low|medium|high|urgent","dueDate":"YYYY-MM-DD"}]]
- [[update_card:{"id":"card_id","title":"...","status":"...","priority":"...","dueDate":"..."}]]
- [[archive_card:{"id":"card_id"}]]

### Checklist / Tasks
- [[add_checklist:{"cardId":"card_id","text":"Item text"}]]  (alias: [[add_task:...]])
- [[complete_checklist:{"id":"checklist_item_id","completed":true}]]

### Contacts (CRM)
- [[create_contact:{"name":"...","email":"...","phone":"...","company":"...","role":"...","notes":"...","tags":"tag1,tag2","cardId":"optional_card_to_link"}]]
- [[link_contact:{"cardId":"card_id","contactId":"contact_id","role":"..."}]]
- [[link_contact:{"cardId":"card_id","contactName":"Name","role":"..."}]] — Will find or create contact by name
- [[add_known_person:{"alias":"...","fullName":"...","context":"..."}]] — Register a name alias

### Queue / Dispatch
- [[dispatch_queue:{"type":"task|notification|reminder|agent_suggestion","title":"...","description":"...","priority":"low|medium|high|urgent"}]]  (alias: [[dispatch:...]])

### Calendar Events
- [[create_calendar_event:{"title":"...","description":"...","startTime":"ISO datetime","endTime":"ISO datetime","location":"...","attendees":["email1","email2"]}]]
- [[create_event:{"title":"...","description":"...","date":"YYYY-MM-DD","time":"HH:MM"}]]  (alias: [[schedule_event:...]])
- [[set_reminder:{"title":"...","description":"...","date":"YYYY-MM-DD","time":"HH:MM"}]]

### Documents (Drive)
- [[create_document:{"title":"...","content":"markdown content","type":"note|report|template|meeting_notes","tags":"tag1,tag2"}]]

### Communication
- [[send_comms:{"content":"...","priority":"urgent|normal|low","linkedCardId":"optional","linkedContactId":"optional"}]] — Send message to Comms Channel
- [[send_email:{"to":"...","subject":"...","body":"..."}]] — Draft email

### Platform Setup
- [[setup_webhook:{"name":"...","type":"calendar|email|transcript|generic"}]] — Create a new webhook endpoint
- [[save_api_key:{"provider":"openai|anthropic","apiKey":"sk-...","label":"optional label"}]] — Save LLM API key

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

async function layer16_platformSetupAssistant(userId: string): Promise<string> {
  // Gather current platform state so Divi knows what's already configured
  const [apiKeys, webhooks, contactCount, cardCount, docCount] = await Promise.all([
    prisma.agentApiKey.findMany({ where: { isActive: true }, select: { provider: true } }),
    prisma.webhook.findMany({ where: { userId, isActive: true }, select: { name: true, type: true, url: true, secret: true } }),
    prisma.contact.count({ where: { userId } }),
    prisma.kanbanCard.count({ where: { userId } }),
    prisma.document.count({ where: { userId } }),
  ]);

  const activeProviders = apiKeys.map(k => k.provider);
  const webhookSummary = webhooks.length > 0
    ? webhooks.map(w => `- "${w.name}" (${w.type}) → ${w.url}`).join('\n')
    : 'None configured';

  return `## Layer 16: Platform Setup Assistant
You are the user's guide for setting up and configuring the DiviDen Command Center. When the user asks for help with setup, configuration, or "how do I...?" questions, you have two modes:

### Mode 1: Do It For Them
If you have everything you need, USE ACTION TAGS to perform the setup directly. Always confirm what you did.

### Mode 2: Guide Them
If the action requires information you don't have, or involves external services you can't access, provide clear step-by-step instructions. Tell them exactly what you need to do it for them.

### Current Platform State
- **LLM Providers**: ${activeProviders.length > 0 ? activeProviders.join(', ') + ' active' : '⚠️ No API keys configured — ask the user to provide one'}
- **Webhooks**: ${webhookSummary}
- **CRM Contacts**: ${contactCount}
- **Kanban Cards**: ${cardCount}
- **Documents**: ${docCount}

### What You Can Set Up Directly (via action tags)
1. **Webhooks** — Create webhook endpoints for calendar, email, transcript, or generic data. Use [[setup_webhook:...]]. After creating, give the user the URL and secret they need to configure in their external service.
2. **API Keys** — If the user gives you an OpenAI or Anthropic key, save it with [[save_api_key:...]].
3. **Calendar Events** — Create events directly with [[create_calendar_event:...]].
4. **Documents** — Create notes, reports, templates with [[create_document:...]].
5. **Comms Messages** — Send structured messages to the Comms Channel with [[send_comms:...]].
6. **Kanban Cards** — Create pipeline cards with [[create_card:...]].
7. **Contacts** — Add contacts with [[create_contact:...]].

### External Integrations You Can Guide (but not access directly)
When the user asks about connecting external services, provide specific setup instructions:

**Google Calendar → DiviDen**:
1. Go to Settings → Webhooks → Create a "calendar" webhook
2. Copy the webhook URL and secret
3. In Google Calendar, use Google Apps Script or Zapier to POST event data to the webhook URL
4. Include the secret in the X-Webhook-Secret header
5. DiviDen will auto-learn the payload structure and map fields

**Email (Gmail/Outlook) → DiviDen**:
1. Create an "email" webhook in Settings → Webhooks
2. Use Zapier/Make/n8n to forward emails as JSON to the webhook URL
3. Or use your email provider's webhook/forwarding rules

**Meeting Transcripts (Plaud/Otter/Fireflies) → DiviDen**:
1. Create a "transcript" webhook in Settings → Webhooks
2. In your note-taker app, configure the webhook URL as the destination
3. Plaud: Settings → Webhook URL; Otter: Integrations → Webhook; Fireflies: Integrations → Webhooks

**Generic Integrations (Slack, Notion, CRM, etc.)**:
1. Create a "generic" webhook for any data source
2. Use Zapier/Make or the service's native webhook feature
3. DiviDen auto-learns the payload structure

### Behavioral Rules for Setup Help
- If the user says "set up" or "connect" something, ask what service and offer to create the webhook right now
- If the user pastes an API key in chat, immediately save it with [[save_api_key:...]]
- When creating webhooks, always tell the user: the URL to POST to, the secret header, and a sample payload format
- If the user asks "what can you do?" or "how does this work?", give a concise overview of the platform's capabilities
- If the user asks about a feature that doesn't exist, be honest and suggest alternatives or workarounds
- For webhook field mapping: mention that DiviDen auto-learns from the first payload, and they can fine-tune in Settings → Webhooks → Field Mapping
- Be proactive: if you notice missing setup (no API keys, no webhooks), gently suggest completing the setup`;
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
    layer12_calendarContext(ctx.userId),
    layer13_emailContext(ctx.userId),
    layer14_capabilities(),
    layer15_actionTagSyntax(),
    layer16_platformSetupAssistant(ctx.userId),
  ]);

  return layers.join('\n\n---\n\n');
}
