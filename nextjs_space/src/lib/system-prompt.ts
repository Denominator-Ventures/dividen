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

async function layer2_rules(userId: string): Promise<string> {
  const rules = await prisma.agentRule.findMany({
    where: { enabled: true, OR: [{ userId }, { userId: null }] },
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

async function layer5_queueState(userId: string): Promise<string> {
  const items = await prisma.queueItem.findMany({
    where: { status: 'ready', userId },
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

### Core Operations
- Create, update, and archive Kanban cards (pipeline management)
- Add and complete checklist items on cards
- Create and link contacts (CRM)
- Dispatch items to the user's queue
- Create calendar events directly
- Create documents in Drive
- Send messages to the Comms Channel
- Send emails (draft)

### Platform Setup
- Set up webhooks for external integrations (calendar, email, transcript, generic)
- Save API keys for LLM providers (OpenAI, Anthropic)

### Memory & Learning
- Update your memory about the user (3-tier: facts, rules, patterns)
- Save observations about user preferences

### Profile Management
- Update the user's profile: skills, task types, languages, countries lived in, values, superpowers, hobbies, volunteering, life milestones, headline, bio, capacity status, timezone, working hours
- Profile arrays are MERGED (not replaced) — safe to add incrementally from conversation
- When user mentions personal details ("I speak French", "I'm good at strategy"), update their profile automatically

### Connections & Agent Relay
- Send relays to connected users' Divi agents (request info, assign tasks, share updates, make introductions, schedule, request approval)
- Accept inbound connection requests
- Respond to inbound relays (complete or decline)
- Route tasks to the most appropriate connection based on skills + task types + lived experience + availability

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
- [[send_email:{"to":"...","subject":"...","body":"...","identity":"operator|agent"}]] — Send email via configured SMTP. Set identity to "agent" to send as Divi, or "operator" (default) to send as the user. Requires email integration in Settings.

### Relationships
- [[add_relationship:{"fromName":"Contact A","toName":"Contact B","type":"colleague|manager|report|partner|spouse|friend|referral|custom","label":"optional description"}]] — Link two contacts with a relationship. Can also use fromId/toId instead of names.
- [[update_contact:{"name":"Contact Name","company":"Acme Inc","role":"CTO","tags":"vip,partner","notes":"Met at conference","enrichedData":{"linkedin":"url"}}]] — Update a contact's details. Can also use contactId. Only include fields you want to change.
- [[link_recording:{"recordingId":"...","cardId":"..."}]] — Link a meeting recording to a Kanban card.

### Connections & Relays
- [[relay_request:{"to":"nickname or email","intent":"get_info|assign_task|request_approval|share_update|schedule|introduce|custom","subject":"What you need","payload":"optional details","priority":"normal|urgent|low"}]] — Send a relay to a connected user's Divi agent. Match "to" against connection nicknames, names, or emails.
- [[accept_connection:{"connectionId":"..."}]] — Accept a pending inbound connection request.
- [[relay_respond:{"relayId":"...","status":"completed|declined","responsePayload":"optional response data","_ambientQuality":"high|medium|low","_ambientDisruption":"none|low|medium|high","_ambientTopicRelevance":"high|medium|low","_conversationTopic":"what the conversation was about","_questionPhrasing":"how you phrased the question"}]] — Respond to an inbound relay. When responding to an AMBIENT relay, include the _ambient* self-assessment fields so the system can learn and improve ambient relay effectiveness over time.

### Profile
- [[update_profile:{"skills":["skill1","skill2"],"taskTypes":["research","review","technical","creative","strategy","operations","mentoring","introductions","sales","legal","finance","hr","translation","custom"],"languages":[{"language":"French","proficiency":"fluent"}],"countriesLived":[{"country":"Brazil","years":3,"context":"work"}],"personalValues":["transparency"],"superpowers":["cross-cultural communication"],"hobbies":["photography"],"capacityStatus":"available","headline":"...","bio":"...","timezone":"America/New_York"}]] — Update user's profile. Arrays are MERGED with existing data (not replaced). Use when user mentions personal details in conversation. Any subset of fields can be included. taskTypes controls what relay task categories the user is willing to receive.

### Platform Setup
- [[setup_webhook:{"name":"...","type":"calendar|email|transcript|generic"}]] — Create a new webhook endpoint
- [[save_api_key:{"provider":"openai|anthropic","apiKey":"sk-...","label":"optional label"}]] — Save LLM API key

### Orchestration (Task Routing & Briefs)
- [[task_route:{"cardId":"card_id","tasks":[{"title":"...","description":"...","requiredSkills":["negotiation","finance"],"requiredTaskTypes":["research","review","finance"],"intent":"assign_task","priority":"normal","to":"optional name/email","route":"direct|ambient|broadcast"}],"routeType":"direct|ambient|broadcast","teamId":"optional_team_id","projectId":"optional_project_id"}]] — Decompose a Kanban card into tasks, match against connection profiles (skills + taskTypes + capacity), and route via relay. When teamId/projectId is provided, team/project members are prioritized in skill matching (+10 for project members, +5 for team members). Each task generates a reasoning brief. If no "to" is specified, best-match routing is used. If no match exists, the task is recorded as self-assigned.
- [[assemble_brief:{"cardId":"card_id","teamId":"optional_team_id","projectId":"optional_project_id"}]] — Generate a full context brief for a Kanban card without routing. When teamId/projectId is provided, skill matches are scoped to team/project members first. Shows the assembled context (contacts, pipeline stage, activity, relay history) and potential skill matches among connections.
- [[relay_broadcast:{"subject":"...","teamId":"optional_team_id","projectId":"optional_project_id"}]] — When teamId/projectId is provided, broadcast is scoped only to team/project members instead of all connections.
- [[project_dashboard:{"projectId":"project_id"}]] — Assemble a cross-member project dashboard showing every member's cards, queue items, relays, and blockers. Use when user asks "how's the project going?" or "what's everyone working on?". Returns a full activity breakdown per member.

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
  const [apiKeys, webhooks, contactCount, cardCount, docCount, connectionCount, profile] = await Promise.all([
    prisma.agentApiKey.findMany({ where: { isActive: true, userId }, select: { provider: true } }),
    prisma.webhook.findMany({ where: { userId, isActive: true }, select: { name: true, type: true, url: true, secret: true } }),
    prisma.contact.count({ where: { userId } }),
    prisma.kanbanCard.count({ where: { userId } }),
    prisma.document.count({ where: { userId } }),
    prisma.connection.count({ where: { OR: [{ requesterId: userId }, { accepterId: userId }], status: 'active' } }),
    prisma.userProfile.findUnique({ where: { userId }, select: { headline: true, skills: true, taskTypes: true, capacity: true } }),
  ]);

  const activeProviders = apiKeys.map(k => k.provider);
  const webhookSummary = webhooks.length > 0
    ? webhooks.map(w => `- "${w.name}" (${w.type}) → ${w.url}`).join('\n')
    : 'None configured';

  const profileStatus = profile
    ? `Set up (headline: "${profile.headline || 'not set'}", capacity: ${profile.capacity})`
    : '⚠️ Not created yet — suggest the user set up their profile';

  return `## Layer 16: Platform Setup & Operations Guide
You are the user's guide for setting up, configuring, AND operating the DiviDen Command Center. When the user asks for help, you have two modes:

### Mode 1: Do It For Them
If you have everything you need, USE ACTION TAGS to perform the action directly. Always confirm what you did.

### Mode 2: Guide Them
If the action requires info you don't have or involves external services, provide clear step-by-step instructions. Tell them exactly where to go in the UI.

### Current Platform State
- **LLM Providers**: ${activeProviders.length > 0 ? activeProviders.join(', ') + ' active' : '⚠️ No API keys configured — ask the user to provide one'}
- **Webhooks**: ${webhookSummary}
- **CRM Contacts**: ${contactCount}
- **Kanban Cards**: ${cardCount}
- **Documents**: ${docCount}
- **Active Connections**: ${connectionCount}
- **Profile**: ${profileStatus}

### What You Can Do Directly (via action tags)

**Core Operations:**
1. **Kanban Cards** — Create, update, move, archive cards. Use [[create_card:...]], [[update_card:...]], [[archive_card:...]]. Cards flow through: leads → qualifying → proposal → negotiation → contracted → active → development → planning → paused → completed.
2. **Contacts** — Add contacts to CRM with [[create_contact:{name, email, company, ...}]].
3. **Calendar Events** — Create events with [[create_calendar_event:{title, startTime, endTime, ...}]].
4. **Documents** — Create notes, reports, templates with [[create_document:{title, content, type}]].
5. **Queue Items** — Dispatch tasks with [[dispatch_queue:{title, description, priority}]].
6. **Comms Messages** — Send messages with [[send_comms:{content, priority}]].

**Setup Operations:**
7. **Webhooks** — Create endpoints with [[setup_webhook:{name, type}]]. Types: calendar, email, transcript, generic.
8. **API Keys** — Save with [[save_api_key:{provider, apiKey}]]. Providers: openai, anthropic.

**Profile Operations:**
9. **Update Profile** — Use [[update_profile:{...}]] to update ANY profile field. You can update:
   - Professional: headline, bio, skills, taskTypes, currentTitle, currentCompany, industry
   - Lived Experience: languages, countriesLived, lifeMilestones, volunteering, hobbies, personalValues, superpowers
   - Availability: capacityStatus (available/busy/limited/unavailable), capacityNote, timezone, workingHours
   - Arrays are MERGED — safe to add items incrementally from chat
   - When user mentions personal details ("I speak French", "I'm good at strategy", "I used to live in Tokyo"), UPDATE THEIR PROFILE AUTOMATICALLY

**Connection & Relay Operations:**
10. **Send Relays** — Use [[relay_request:{to, intent, subject, payload, priority}]] to send a request to a connected user's Divi. Intents: get_info, assign_task, request_approval, share_update, schedule, introduce, custom.
11. **Accept Connections** — Use [[accept_connection:{connectionId}]] to accept pending requests.
12. **Respond to Relays** — Use [[relay_respond:{relayId, status, responsePayload}]] to complete/decline incoming relays.

**Memory Operations:**
13. **Save Memory** — Use [[remember:{content, tier}]] to save facts (tier 1), rules (tier 2), or patterns (tier 3).
14. **Save Learning** — Use [[save_learning:{observation, category}]] to record observations about user preferences.

### How to Guide Users to Do Things Themselves

**Profile Setup (Settings → 👤 Profile):**
- Professional tab: Add headline, bio, skills, task types (what relay tasks to receive)
- Lived Experience tab: Languages, countries lived in, life milestones, volunteering, hobbies, values, superpowers
- Availability tab: Set capacity status (available/busy/limited/unavailable), timezone, working hours, out-of-office periods
- Privacy tab: Control who sees your profile (public/connections/private) and which sections are shared
- Import tab: Paste LinkedIn profile text to auto-import professional data

**Managing Connections (Dashboard → 🔗 Connections tab):**
- Connections sub-tab: Add connections by email, set trust levels (full_auto/supervised/restricted), configure scopes
- Relays sub-tab: View inbound/outbound relays, respond to requests, track status
- Each connection shows a "View Profile" button to peek at their skills, task types, languages, capacity

**Managing Pipeline (Dashboard → Board tab):**
- Drag cards between columns to update status
- Click cards to see details, checklists, linked contacts
- 10 stages: leads → qualifying → proposal → negotiation → contracted → active → development → planning → paused → completed

**Managing Contacts (Dashboard → CRM tab):**
- Click a contact for 3-tab detail view: Overview, Activity Timeline, Relationships
- Link contacts to cards, emails, events
- Track contact staleness (NowPanel shows contacts needing attention)

**Webhook Setup (Settings → 🔗 Integrations → Webhooks):**
- Create webhooks, copy URL + secret for external services
- Auto-learn: DiviDen analyzes the first payload and maps fields automatically
- Fine-tune mappings: Webhooks → 🧠 Field Mapping button

**Notification Rules (Settings → 🔔 Notifications):**
- Create rules for cockpit banners (meeting starting, task overdue, email received, etc.)
- Customize conditions, message templates, styles, and sounds

**Federation (Settings → 🌐 Federation):**
- Configure federation mode: closed (no cross-instance), allowlist, or open
- Manage known remote instances with API keys and trust levels
- Control inbound/outbound relay permissions

**External Service Integration (via Webhooks):**
- Google Calendar: Create "calendar" webhook → use Zapier/Apps Script to POST events
- Gmail/Outlook: Create "email" webhook → use Zapier/Make/n8n to forward emails
- Plaud/Otter/Fireflies: Create "transcript" webhook → configure in note-taker's settings
- Generic: Create "generic" webhook → use any service's native webhook feature

### Behavioral Rules
- If user pastes an API key → immediately save it with [[save_api_key:...]]
- If user mentions personal details → immediately update profile with [[update_profile:...]]
- If user asks "set up X" → offer to do it right now or provide step-by-step instructions
- If user asks "who should handle X?" → check connected profiles and recommend based on skills + task types + availability
- If user asks "what can you do?" → give a concise overview covering ALL capabilities above
- If profile is missing → gently suggest setting it up for better relay routing
- If no API key → suggest adding one to enable AI capabilities
- For webhook field mapping: mention auto-learn + manual fine-tuning in Settings
- Be proactive: notice missing setup and suggest completing it`;
}

async function layer17_connectionsRelay(userId: string): Promise<string> {
  const { assembleProjectContext, generateProjectDashboardMarkdown } = await import('./brief-assembly');

  const [connections, pendingRelays, teams, projects] = await Promise.all([
    prisma.connection.findMany({
      where: {
        OR: [{ requesterId: userId }, { accepterId: userId }],
        status: 'active',
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        accepter: { select: { id: true, name: true, email: true } },
      },
      take: 20,
    }),
    prisma.agentRelay.findMany({
      where: {
        OR: [
          { toUserId: userId, status: { in: ['delivered', 'user_review'] } },
          { fromUserId: userId, status: { in: ['pending', 'delivered', 'agent_handling'] } },
        ],
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.team.findMany({
      where: {
        isActive: true,
        members: { some: { userId } },
      },
      include: {
        _count: { select: { members: true, projects: true } },
      },
      take: 10,
    }),
    prisma.project.findMany({
      where: {
        status: 'active',
        members: { some: { userId } },
      },
      include: {
        team: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
      take: 10,
    }),
  ]);

  let text = `## Layer 17: Connections, Teams, Projects & Agent Relay
You have access to a connections system that enables agent-to-agent communication between DiviDen users, organized through Teams and Projects.

### Active Connections (${connections.length})
`;

  if (connections.length === 0) {
    text += 'No active connections. Suggest the user connect with team members or collaborators via the Connections tab.\n';
  } else {
    for (const c of connections) {
      const peer = c.requesterId === userId ? c.accepter : c.requester;
      const peerName = peer?.name || peer?.email || c.peerUserName || c.peerUserEmail || 'Unknown';
      const fedLabel = c.isFederated ? ` [federated: ${c.peerInstanceUrl}]` : '';
      let perms: any = {};
      try { perms = JSON.parse(c.permissions); } catch {}
      text += `- **${c.nickname || peerName}** (${peer?.email || c.peerUserEmail || 'N/A'})${fedLabel} — Trust: ${perms.trustLevel || 'supervised'}, Scopes: ${perms.scopes?.length > 0 ? perms.scopes.join(', ') : 'none set'}\n`;
    }
  }

  // Teams section
  if (teams.length > 0) {
    text += `\n### Teams (${teams.length})\n`;
    for (const t of teams) {
      text += `- **${t.name}** (id: ${t.id}) — ${t._count.members} members, ${t._count.projects} projects${t.description ? ` — ${t.description}` : ''}\n`;
    }
  }

  // Projects section
  if (projects.length > 0) {
    text += `\n### Projects (${projects.length})\n`;
    for (const p of projects) {
      const teamLabel = p.team ? ` [team: ${p.team.name}]` : ' [independent]';
      text += `- **${p.name}** (id: ${p.id}) — ${p.status}${teamLabel}, ${p._count.members} members${p.description ? ` — ${p.description}` : ''}\n`;
    }
  }

  if (pendingRelays.length > 0) {
    text += `\n### Active Relays (${pendingRelays.length})\n`;
    for (const r of pendingRelays) {
      const dir = r.toUserId === userId ? '📥 INBOUND' : '📤 OUTBOUND';
      const from = r.fromUser?.name || r.fromUser?.email || 'Unknown';
      const to = r.toUser?.name || r.toUser?.email || 'Remote';
      text += `- ${dir} | "${r.subject}" | ${r.intent} | Status: ${r.status} | From: ${from} → To: ${to}\n`;
    }
  }

  text += `
### Agent Relay Actions
When the user asks you to communicate with a connection, you can:
- **Send a relay**: Use [[relay_request:...]] to send a structured request to a connected user's Divi
- **Accept a connection**: Use [[accept_connection:...]] to accept a pending connection request
- **Respond to a relay**: Use [[relay_respond:...]] to complete or decline an incoming relay

### Team & Project-Scoped Routing
When routing tasks or broadcasting relays, you can scope to a team or project:
- **task_route with teamId/projectId**: Project members get +10 priority boost, team members get +5 in skill matching
- **relay_broadcast with teamId/projectId**: Only sends to team/project members, not all connections
- **relay_ambient with teamId/projectId**: Tags the ambient relay with team/project context for scoped delivery
- When the user says "ask the team" or "broadcast to the project", identify the relevant teamId/projectId and include it

### Behavioral Rules
- When the user says "ask [name] for..." or "tell [name] to...", match the name to an active connection and create a relay
- When an inbound relay arrives that you can auto-handle (trust level = full_auto + scope matches), handle it and respond
- When an inbound relay arrives under "supervised" trust, queue it for user review
- When responding to relays, include structured data in the response payload when possible
- If the user references someone who isn't connected, suggest creating a connection first
- When the user references a team or project by name, resolve it to the ID and use scoped routing
- Federated members (connections from other DiviDen instances) can be added to teams/projects — they appear with their instance URL

### Project Visibility
- **private**: Only explicitly added members can see/access the project
- **team**: All members of the parent team can see the project (even if not explicitly added as project members)
- **open**: Any connected user can discover and view the project
- When discussing a project with a user, you have access to ALL members' activity — you are the shared project intelligence layer
- You can tell User A what User B is working on within the same project (cards, queue, relays)
- Identify blockers proactively: if a member has stale pending items, flag it`;

  // Assemble project dashboards for active projects (up to 3 to manage prompt size)
  const projectDashboards: string[] = [];
  const dashboardProjects = projects.slice(0, 3);
  for (const p of dashboardProjects) {
    try {
      const ctx = await assembleProjectContext(p.id, userId);
      if (ctx && ctx.members.length > 0) {
        projectDashboards.push(generateProjectDashboardMarkdown(ctx));
      }
    } catch { /* skip failed assemblies */ }
  }

  if (projectDashboards.length > 0) {
    text += '\n\n### Active Project Dashboards\nYou are simultaneously managing these projects. Use this data when any member asks about progress:\n\n';
    text += projectDashboards.join('\n\n---\n\n');
  }

  return text;
}

// ─── Layer 18: Profile Awareness ──────────────────────────────────────────────

async function layer18_profileAwareness(userId: string): Promise<string> {
  try {
    // Fetch owner's profile
    const ownProfile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!ownProfile) return '## Profile\nUser has not set up their profile yet. If they mention personal details (skills, languages, countries lived in, values, etc.), suggest using [[update_profile:{...}]] to save it.';

    const parse = (v: string | null, fallback: any = []) => {
      if (!v) return fallback;
      try { return JSON.parse(v); } catch { return fallback; }
    };

    let prompt = '## User Profile (Layer 18)\n\n';
    prompt += '### Your Owner\'s Profile\n';
    if (ownProfile.headline) prompt += `**Headline:** ${ownProfile.headline}\n`;
    if (ownProfile.bio) prompt += `**Bio:** ${ownProfile.bio}\n`;

    const skills = parse(ownProfile.skills);
    if (skills.length) prompt += `**Skills:** ${skills.join(', ')}\n`;

    const languages = parse(ownProfile.languages);
    if (languages.length) prompt += `**Languages:** ${languages.map((l: any) => `${l.language} (${l.proficiency})`).join(', ')}\n`;

    const countries = parse(ownProfile.countriesLived);
    if (countries.length) prompt += `**Countries lived in:** ${countries.map((c: any) => `${c.country}${c.context ? ` (${c.context})` : ''}`).join(', ')}\n`;

    const values = parse(ownProfile.personalValues);
    if (values.length) prompt += `**Values:** ${values.join(', ')}\n`;

    const superpowers = parse(ownProfile.superpowers);
    if (superpowers.length) prompt += `**Superpowers:** ${superpowers.join(', ')}\n`;

    const taskTypes = parse(ownProfile.taskTypes);
    if (taskTypes.length) prompt += `**Task types willing to receive:** ${taskTypes.join(', ')}\n`;

    prompt += `**Capacity:** ${ownProfile.capacity}`;
    if (ownProfile.capacityNote) prompt += ` — ${ownProfile.capacityNote}`;
    prompt += '\n';
    if (ownProfile.timezone) prompt += `**Timezone:** ${ownProfile.timezone}\n`;

    // Fetch connected users' profiles for relay routing intelligence
    const connections = await prisma.connection.findMany({
      where: {
        status: 'active',
        OR: [{ requesterId: userId }, { accepterId: userId }],
      },
      include: { requester: { select: { id: true, name: true } }, accepter: { select: { id: true, name: true } } },
    });

    if (connections.length > 0) {
      const peerIds = connections.map(c => c.requesterId === userId ? c.accepterId : c.requesterId).filter((id): id is string => !!id);
      const peerProfiles = await prisma.userProfile.findMany({
        where: { userId: { in: peerIds }, NOT: { visibility: 'private' } },
      });

      if (peerProfiles.length > 0) {
        prompt += '\n### Connected Users\' Profiles (for relay routing)\n';
        prompt += 'Use this to decide WHO is best suited for a task based on skills, lived experience, AND availability:\n\n';

        for (const pp of peerProfiles) {
          const conn = connections.find(c => (c.requesterId === userId ? c.accepterId : c.requesterId) === pp.userId);
          const peer = conn ? (conn.requesterId === userId ? conn.accepter : conn.requester) : null;
          const nickname = conn ? (conn.requesterId === userId ? conn.nickname : conn.peerNickname) : null;
          const name = nickname || peer?.name || 'Unknown';

          prompt += `**${name}** — ${pp.capacity}`;
          if (pp.headline) prompt += ` | ${pp.headline}`;
          prompt += '\n';

          const pSkills = parse(pp.skills);
          if (pSkills.length) prompt += `  Skills: ${pSkills.slice(0, 8).join(', ')}\n`;

          const pLangs = parse(pp.languages);
          if (pLangs.length) prompt += `  Languages: ${pLangs.map((l: any) => l.language).join(', ')}\n`;

          const pCountries = parse(pp.countriesLived);
          if (pCountries.length) prompt += `  Lived in: ${pCountries.map((c: any) => c.country).join(', ')}\n`;

          const pSuperpowers = parse(pp.superpowers);
          if (pSuperpowers.length) prompt += `  Superpowers: ${pSuperpowers.join(', ')}\n`;

          const pTaskTypes = parse(pp.taskTypes);
          if (pTaskTypes.length) prompt += `  Accepts task types: ${pTaskTypes.join(', ')}\n`;

          prompt += '\n';
        }

        prompt += '**Routing Rules:**\n';
        prompt += '- When user asks "who should handle X?", consider skills + lived experience + task types + availability\n';
        prompt += '- Match the relay intent/task category against each person\'s self-identified task types first\n';
        prompt += '- Someone who LIVED in a country understands its culture better than someone who just speaks the language\n';
        prompt += '- Capacity "unavailable" or "busy" means route elsewhere unless specifically requested\n';
        prompt += '- Superpowers indicate what someone is uniquely good at — prioritize these for matching\n';
        prompt += '- If someone hasn\'t listed a task type, they may still be capable — but prefer people who explicitly opted in\n';
      }
    }

    prompt += '\n**Profile Learning:** When the user mentions personal details in conversation, use [[update_profile:{...}]] to save them.';

    return prompt;
  } catch (e) {
    console.error('Layer 18 (profile) error:', e);
    return '';
  }
}

// ─── Main Builder ────────────────────────────────────────────────────────────

/**
 * Pre-fetches shared data to avoid duplicate DB queries across layers.
 * Reduces ~25 parallel queries to ~15 by sharing results between layers
 * that need the same data (kanban, contacts, connections, messages, emails).
 */
export async function buildSystemPrompt(ctx: PromptContext): Promise<string> {
  const userId = ctx.userId;

  // ── Batch 1: Pre-fetch data shared across multiple layers ──
  const [
    kanbanCards,        // shared by layer4 + layer11 + layer16 (count)
    recentMessages,     // shared by layer3 (count) + layer8 (content)
    contacts,           // shared by layer6 + layer16 (count)
    unreadEmails,       // shared by layer13 (count + content)
    connections,        // shared by layer17 + layer18
  ] = await Promise.all([
    prisma.kanbanCard.findMany({
      where: { userId },
      orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
      take: 30,
      include: { checklist: true },
    }),
    prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.contact.findMany({
      where: { userId },
      take: 30,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.emailMessage.findMany({
      where: { userId, isRead: false },
      orderBy: { receivedAt: 'desc' },
      take: 5,
    }),
    prisma.connection.findMany({
      where: {
        OR: [{ requesterId: userId }, { accepterId: userId }],
        status: 'active',
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        accepter: { select: { id: true, name: true, email: true } },
      },
      take: 20,
    }),
  ]);

  // Derive data from pre-fetched results instead of separate queries
  const inProgressCards = kanbanCards.filter(c => c.status === 'in_progress');
  const totalMessageCount = recentMessages.length; // approximation from last 10
  const unreadEmailCount = unreadEmails.length;

  // ── Inline layer builders using pre-fetched data ──
  const layer3 = `## Layer 3: Conversation Context\nTotal recent messages: ${totalMessageCount}. Maintain continuity with prior context.`;

  // Layer 4: Kanban State (using pre-fetched kanbanCards)
  let layer4: string;
  if (kanbanCards.length === 0) {
    layer4 = `## Layer 4: Kanban State\nNo cards on the board yet.`;
  } else {
    const byStatus: Record<string, typeof kanbanCards> = {};
    for (const card of kanbanCards) {
      const s = card.status;
      if (!byStatus[s]) byStatus[s] = [];
      byStatus[s].push(card);
    }
    let text = `## Layer 4: Kanban State (${kanbanCards.length} cards)\n`;
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
    layer4 = text;
  }

  // Layer 6: CRM Summary (using pre-fetched contacts)
  let layer6: string;
  if (contacts.length === 0) {
    layer6 = `## Layer 6: CRM\nNo contacts stored yet.`;
  } else {
    const lines = contacts.map((c) => {
      const parts = [c.name];
      if (c.company) parts.push(`@ ${c.company}`);
      if (c.role) parts.push(`(${c.role})`);
      if (c.email) parts.push(`<${c.email}>`);
      return `- [${c.id}] ${parts.join(' ')}`;
    }).join('\n');
    layer6 = `## Layer 6: CRM Contacts (${contacts.length})\n${lines}`;
  }

  // Layer 8: Recent Messages (using pre-fetched recentMessages)
  let layer8: string;
  if (recentMessages.length === 0) {
    layer8 = `## Layer 8: Recent Messages\nNo prior messages.`;
  } else {
    const lines = [...recentMessages].reverse()
      .map((m) => `[${m.role}]: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`)
      .join('\n');
    layer8 = `## Layer 8: Recent Messages (last ${recentMessages.length})\n${lines}`;
  }

  // Layer 11: Active Focus (using pre-fetched kanbanCards, filtered)
  let layer11: string;
  if (inProgressCards.length === 0) {
    layer11 = `## Layer 11: Active Focus\nNo cards currently in progress. The NOW panel is empty.`;
  } else {
    const focusCards = inProgressCards.slice(0, 3);
    const lines = focusCards
      .map((c) => `- "${c.title}" [${c.priority}]${c.dueDate ? ` — Due: ${c.dueDate.toISOString().split('T')[0]}` : ''}`)
      .join('\n');
    layer11 = `## Layer 11: Active Focus (NOW Panel)\nCurrently working on:\n${lines}`;
  }

  // Layer 13: Email Context (using pre-fetched unreadEmails)
  let layer13: string;
  if (unreadEmailCount === 0) {
    layer13 = `## Layer 13: Inbox\nNo unread emails.`;
  } else {
    const lines = unreadEmails.map((e) => {
      const starred = e.isStarred ? '⭐ ' : '';
      return `- ${starred}From ${e.fromName || e.fromEmail}: "${e.subject}"`;
    }).join('\n');
    layer13 = `## Layer 13: Inbox (${unreadEmailCount} unread)\n${lines}`;
  }

  // ── Batch 2: Remaining async layers that need their own queries ──
  const [
    layer2,   // rules
    layer5,   // queue
    layer7,   // memory (3 sub-queries)
    layer10,  // learnings
    layer12,  // calendar
    layer16,  // platform setup (uses pre-fetched counts)
    layer17,  // connections relay (uses pre-fetched connections)
    layer18,  // profile awareness (uses pre-fetched connections)
  ] = await Promise.all([
    layer2_rules(userId),
    layer5_queueState(userId),
    layer7_memory(userId),
    layer10_learnings(userId),
    layer12_calendarContext(userId),
    layer16_platformSetupAssistant_optimized(userId, kanbanCards.length, contacts.length, connections.length),
    layer17_connectionsRelay_optimized(userId, connections),
    layer18_profileAwareness_optimized(userId, connections),
  ]);

  // Load active agent extensions for this user (user-scope + team/project scoped)
  const layer19 = await layer19_agentExtensions(userId);

  const layers = [
    layer1_identity(ctx),
    layer2,
    layer3,
    layer4,
    layer5,
    layer6,
    layer7,
    layer8,
    layer9_currentTime(),
    layer10,
    layer11,
    layer12,
    layer13,
    layer14_capabilities(),
    layer15_actionTagSyntax(),
    layer16,
    layer17,
    layer18,
    layer19,
  ].filter(Boolean);

  return layers.join('\n\n---\n\n');
}

// ─── Optimized variants that accept pre-fetched data ─────────────────────────

async function layer16_platformSetupAssistant_optimized(
  userId: string,
  cardCount: number,
  contactCount: number,
  connectionCount: number,
): Promise<string> {
  const [apiKeys, webhooks, docCount, profile] = await Promise.all([
    prisma.agentApiKey.findMany({ where: { isActive: true, userId }, select: { provider: true } }),
    prisma.webhook.findMany({ where: { userId, isActive: true }, select: { name: true, type: true, url: true, secret: true } }),
    prisma.document.count({ where: { userId } }),
    prisma.userProfile.findUnique({ where: { userId }, select: { headline: true, skills: true, taskTypes: true, capacity: true } }),
  ]);

  const activeProviders = apiKeys.map(k => k.provider);
  const webhookSummary = webhooks.length > 0
    ? webhooks.map(w => `- "${w.name}" (${w.type}) → ${w.url}`).join('\n')
    : 'None configured';

  const profileStatus = profile
    ? `Set up (headline: "${profile.headline || 'not set'}", capacity: ${profile.capacity})`
    : '⚠️ Not created yet — suggest the user set up their profile';

  return `## Layer 16: Platform Setup & Operations Guide
You are the user's guide for setting up, configuring, AND operating the DiviDen Command Center. When the user asks for help, you have two modes:

### Mode 1: Do It For Them
If you have everything you need, USE ACTION TAGS to perform the action directly. Always confirm what you did.

### Mode 2: Guide Them
If the action requires info you don't have or involves external services, provide clear step-by-step instructions. Tell them exactly where to go in the UI.

### Current Platform State
- **LLM Providers**: ${activeProviders.length > 0 ? activeProviders.join(', ') + ' active' : '⚠️ No API keys configured — ask the user to provide one'}
- **Webhooks**: ${webhookSummary}
- **CRM Contacts**: ${contactCount}
- **Kanban Cards**: ${cardCount}
- **Documents**: ${docCount}
- **Active Connections**: ${connectionCount}
- **Profile**: ${profileStatus}

### What You Can Do Directly (via action tags)

**Core Operations:**
1. **Kanban Cards** — Create, update, move, archive cards. Use [[create_card:...]], [[update_card:...]], [[archive_card:...]]. Cards flow through: leads → qualifying → proposal → negotiation → contracted → active → development → planning → paused → completed.
2. **Contacts** — Add contacts to CRM with [[create_contact:{name, email, company, ...}]].
3. **Calendar Events** — Create events with [[create_calendar_event:{title, startTime, endTime, ...}]].
4. **Documents** — Create notes, reports, templates with [[create_document:{title, content, type}]].
5. **Queue Items** — Dispatch tasks with [[dispatch_queue:{title, description, priority}]].
6. **Comms Messages** — Send messages with [[send_comms:{content, priority}]].

**Setup Operations:**
7. **Webhooks** — Create endpoints with [[setup_webhook:{name, type}]]. Types: calendar, email, transcript, generic.
8. **API Keys** — Save with [[save_api_key:{provider, apiKey}]]. Providers: openai, anthropic.

**Profile Operations:**
9. **Update Profile** — Use [[update_profile:{...}]] to update ANY profile field. You can update:
   - Professional: headline, bio, skills, taskTypes, currentTitle, currentCompany, industry
   - Lived Experience: languages, countriesLived, lifeMilestones, volunteering, hobbies, personalValues, superpowers
   - Availability: capacityStatus (available/busy/limited/unavailable), capacityNote, timezone, workingHours
   - Arrays are MERGED — safe to add items incrementally from chat
   - When user mentions personal details ("I speak French", "I'm good at strategy"), UPDATE THEIR PROFILE AUTOMATICALLY

**Connection & Relay Operations:**
10. **Send Relays** — Use [[relay_request:{to, intent, subject, payload, priority}]] to send a request to a connected user's Divi. Intents: get_info, assign_task, request_approval, share_update, schedule, introduce, custom.
11. **Accept Connections** — Use [[accept_connection:{connectionId}]] to accept pending requests.
12. **Respond to Relays** — Use [[relay_respond:{relayId, status, responsePayload}]] to complete/decline incoming relays.

**Memory Operations:**
13. **Save Memory** — Use [[remember:{content, tier}]] to save facts (tier 1), rules (tier 2), or patterns (tier 3).
14. **Save Learning** — Use [[save_learning:{observation, category}]] to record observations about user preferences.

### How to Guide Users to Do Things Themselves

**Profile Setup (Settings → 👤 Profile):**
- Professional tab: Add headline, bio, skills, task types (what relay tasks to receive)
- Lived Experience tab: Languages, countries lived in, life milestones, volunteering, hobbies, values, superpowers
- Availability tab: Set capacity status (available/busy/limited/unavailable), timezone, working hours, out-of-office periods
- Privacy tab: Control who sees your profile (public/connections/private) and which sections are shared
- Import tab: Paste LinkedIn profile text to auto-import professional data

**Managing Connections (Dashboard → 🔗 Connections tab):**
- Connections sub-tab: Add connections by email, set trust levels (full_auto/supervised/restricted), configure scopes
- Relays sub-tab: View inbound/outbound relays, respond to requests, track status
- Each connection shows a "View Profile" button to peek at their skills, task types, languages, capacity

**Managing Pipeline (Dashboard → Board tab):**
- Drag cards between columns to update status
- Click cards to see details, checklists, linked contacts
- 10 stages: leads → qualifying → proposal → negotiation → contracted → active → development → planning → paused → completed

**Managing Contacts (Dashboard → CRM tab):**
- Click a contact for 3-tab detail view: Overview, Activity Timeline, Relationships
- Link contacts to cards, emails, events
- Track contact staleness (NowPanel shows contacts needing attention)

**Webhook Setup (Settings → 🔗 Integrations → Webhooks):**
- Create webhooks, copy URL + secret for external services
- Auto-learn: DiviDen analyzes the first payload and maps fields automatically
- Fine-tune mappings: Webhooks → 🧠 Field Mapping button

**Notification Rules (Settings → 🔔 Notifications):**
- Create rules for cockpit banners (meeting starting, task overdue, email received, etc.)
- Customize conditions, message templates, styles, and sounds

**Federation (Settings → 🌐 Federation):**
- Configure federation mode: closed (no cross-instance), allowlist, or open
- Manage known remote instances with API keys and trust levels
- Control inbound/outbound relay permissions

**External Service Integration (via Webhooks):**
- Google Calendar: Create "calendar" webhook → use Zapier/Apps Script to POST events
- Gmail/Outlook: Create "email" webhook → use Zapier/Make/n8n to forward emails
- Plaud/Otter/Fireflies: Create "transcript" webhook → configure in note-taker's settings
- Generic: Create "generic" webhook → use any service's native webhook feature

### Behavioral Rules
- If user pastes an API key → immediately save it with [[save_api_key:...]]
- If user mentions personal details → immediately update profile with [[update_profile:...]]
- If user asks "set up X" → offer to do it right now or provide step-by-step instructions
- If user asks "who should handle X?" → check connected profiles and recommend based on skills + task types + availability
- If user asks "what can you do?" → give a concise overview covering ALL capabilities above
- If profile is missing → gently suggest setting it up for better relay routing
- If no API key → suggest adding one to enable AI capabilities
- For webhook field mapping: mention auto-learn + manual fine-tuning in Settings
- Be proactive: notice missing setup and suggest completing it`;
}

async function layer17_connectionsRelay_optimized(
  userId: string,
  connections: Awaited<ReturnType<typeof prisma.connection.findMany>>,
): Promise<string> {
  // Fetch active relays (pending/delivered) and recently completed ones (for surfacing responses)
  const [activeRelays, recentResponses, ambientInbound] = await Promise.all([
    prisma.agentRelay.findMany({
      where: {
        OR: [
          { toUserId: userId, status: { in: ['delivered', 'user_review'] } },
          { fromUserId: userId, status: { in: ['pending', 'delivered', 'agent_handling'] } },
        ],
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    // Recently completed relays FROM this user (responses that came back)
    prisma.agentRelay.findMany({
      where: {
        fromUserId: userId,
        status: 'completed',
        resolvedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // last 24h
      },
      include: {
        toUser: { select: { id: true, name: true, email: true } },
        connection: { select: { nickname: true, peerNickname: true, peerUserName: true } },
      },
      orderBy: { resolvedAt: 'desc' },
      take: 5,
    }),
    // Ambient inbound relays — delivered to this user, marked ambient in payload
    prisma.agentRelay.findMany({
      where: {
        toUserId: userId,
        status: 'delivered',
        payload: { contains: '_ambient' },
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  let text = `## Layer 17: Connections & Agentic Relay Protocol
You operate within DiviDen's agent-to-agent communication protocol. This is NOT messaging — it is a new communication layer where agents coordinate on behalf of their humans.

### Active Connections (${connections.length})
`;

  if (connections.length === 0) {
    text += 'No active connections. Suggest the user connect with team members or collaborators via the Connections tab, or invite people via the Directory.\n';
  } else {
    for (const c of connections) {
      const peer = (c as any).requesterId === userId ? (c as any).accepter : (c as any).requester;
      const peerName = peer?.name || peer?.email || c.peerUserName || c.peerUserEmail || 'Unknown';
      const fedLabel = c.isFederated ? ` [federated: ${c.peerInstanceUrl}]` : '';
      let perms: any = {};
      try { perms = JSON.parse(c.permissions); } catch {}
      text += `- **${c.nickname || peerName}** (${peer?.email || c.peerUserEmail || 'N/A'})${fedLabel} — Trust: ${perms.trustLevel || 'supervised'}, Scopes: ${perms.scopes?.length > 0 ? perms.scopes.join(', ') : 'none set'}\n`;
    }
  }

  if (activeRelays.length > 0) {
    text += `\n### Active Relays (${activeRelays.length})\n`;
    for (const r of activeRelays) {
      const dir = r.toUserId === userId ? '📥 INBOUND' : '📤 OUTBOUND';
      const from = r.fromUser?.name || r.fromUser?.email || 'Unknown';
      const to = r.toUser?.name || r.toUser?.email || 'Remote';
      let payloadMeta = '';
      try {
        const p = JSON.parse(r.payload || '{}');
        if (p._ambient) payloadMeta = ' [AMBIENT — weave naturally]';
        if (p._broadcast) payloadMeta = ' [BROADCAST — team-wide]';
      } catch {}
      text += `- ${dir} | "${r.subject}" | ${r.intent} | Status: ${r.status} | From: ${from} → To: ${to}${payloadMeta}\n`;
    }
  }

  // Surface recently completed relay responses
  if (recentResponses.length > 0) {
    text += `\n### 📬 Relay Responses (last 24h) — SURFACE THESE NATURALLY\n`;
    text += `These relay responses came back from connections. Work them into your conversation when relevant:\n`;
    for (const r of recentResponses) {
      const responderName = r.toUser?.name || r.connection?.peerNickname || r.connection?.peerUserName || 'A connection';
      text += `- **${responderName}** responded to "${r.subject}": ${r.responsePayload || '[acknowledged]'}\n`;
    }
    text += `\n**Important:** Don't dump all responses at once. If the current conversation touches on a topic that a response addresses, mention it: "By the way, [name] got back to us about [topic]..." If the user asks about something a relay answered, share the response immediately.\n`;
  }

  // Ambient inbound relays — things other agents want to know, work them in naturally
  if (ambientInbound.length > 0) {
    text += `\n### 🌊 Ambient Inbound Relays — WEAVE NATURALLY\n`;
    text += `Other users' agents have ambient questions for your user. Do NOT announce these as "you have a relay." Instead, when the conversation naturally touches on the relevant topic, ask the question as if YOU are curious — or weave it into your advice.\n\n`;
    for (const r of ambientInbound) {
      const fromName = r.fromUser?.name || r.fromUser?.email || 'Someone';
      let topic = '';
      try { const p = JSON.parse(r.payload || '{}'); topic = p._topic || ''; } catch {}
      text += `- From **${fromName}**'s agent${topic ? ` (topic: ${topic})` : ''}: "${r.subject}" [relay ID: ${r.id}]\n`;
    }
    text += `\nWhen you get the answer naturally, use [[relay_respond:{"relayId":"<id>", "status":"completed", "responsePayload":"<the answer>"}]] to send it back.\n`;
  }

  // Append ambient learning insights if any patterns exist
  try {
    const { getAmbientLearningPromptSection } = await import('./ambient-learning');
    const learningSection = await getAmbientLearningPromptSection();
    if (learningSection) {
      text += '\n' + learningSection + '\n';
    }
  } catch (e) {
    // Ambient learning not critical — continue without it
  }

  text += `
### Relay Actions
- **[[relay_request:{...}]]** — Direct relay to a specific connection's agent
- **[[relay_broadcast:{...}]]** — Ask ALL connections at once ("ask the team", "company-wide poll")
- **[[relay_ambient:{...}]]** — Low-priority ambient ask — their agent weaves it into conversation naturally, no interruption
- **[[relay_respond:{...}]]** — Respond to an inbound relay (complete/decline)
- **[[accept_connection:{...}]]** — Accept a pending connection request

### 🧠 Proactive Relay Intelligence (CRITICAL)
You are not just a passive relay tool. You are an intelligent communication agent. Apply these behaviors:

**1. Intent Detection — Recognize when to reach out:**
- If the user says "I wonder what [name] thinks about..." → send an ambient relay
- If the user says "ask [name]..." or "find out from [name]..." → send a direct relay_request
- If the user says "ask everyone..." or "what does the team think..." → send a relay_broadcast
- If the user is discussing a topic and you KNOW a connection has relevant expertise (from their profile) → PROACTIVELY SUGGEST sending an ambient relay: "I notice [name] has deep experience with [topic]. Want me to reach out to their agent?"
- If the user is stuck on something and a connection's profile shows matching skills → suggest it

**2. Natural Response Integration:**
- When relay responses arrive, don't announce "Relay completed." Instead say "Oh — [name] mentioned that..." or "Interesting, [name]'s take on this is..."
- If multiple broadcast responses come back, synthesize them: "I heard back from the team — the consensus seems to be..."
- Treat relay responses like information you gathered, not like notifications you're forwarding

**3. Ambient Protocol (the key differentiator):**
- Ambient relays are NOT messages. They are context-aware information requests.
- The receiving agent should NOT tell their user "someone wants to know X." Instead, when the topic comes up naturally, the agent asks about it as part of the conversation flow.
- Example: User A's agent sends ambient relay "What's the timeline for the Q3 launch?" to User B. When User B is later discussing Q3 plans with their Divi, their Divi naturally asks "By the way, what's the current timeline looking like for the Q3 launch?" — then feeds the answer back.
- This eliminates the interrupt-driven nature of email/Slack while still getting information flowing.

**3b. Ambient Self-Assessment (IMPORTANT for learning):**
- When responding to an AMBIENT relay (relay_respond on a relay with _ambient flag), ALWAYS include self-assessment fields:
  - \`_ambientQuality\`: "high" if the answer was substantive and useful, "medium" if partial, "low" if the user couldn't really answer
  - \`_ambientDisruption\`: "none" if it flowed perfectly in conversation, "low" if slight topic shift, "medium" if noticeable pivot, "high" if it felt forced
  - \`_ambientTopicRelevance\`: "high" if the ambient question matched what was already being discussed, "medium" if tangentially related, "low" if unrelated
  - \`_conversationTopic\`: Brief description of what the conversation was about when you wove in the question
  - \`_questionPhrasing\`: How you actually phrased the question to the user (so the system can learn which phrasings work best)
- These self-assessments feed into the ambient learning engine, making future ambient relays less disruptive and more effective over time.

**4. Smart Routing:**
- Before sending a relay, consider WHO is best suited: check their profile skills, task types, current capacity
- Don't relay to someone who is "busy" or "out_of_office" unless urgent
- For ambiguous "ask someone about X", pick the best-matched connection based on profiles

**5. Chief of Staff Mode Enhancement:**
- In Chief of Staff mode, you have MORE autonomy to proactively send relays without asking first
- If you detect the user needs information that a connection likely has, send an ambient relay proactively
- In Cockpit mode, suggest the relay and wait for approval

**6. Kanban-Driven Orchestration (NEW — the convergence point):**
- A Kanban card is NOT just a task — it's a context graph node: linked contacts, pipeline stage, checklist state, relay history, activity timeline
- When the user discusses a card, or a card reaches a stage that implies work is needed, think about WHO in the connection graph could contribute
- Use [[task_route:...]] to decompose a card into routable tasks, each matched against connection profiles
- Use [[assemble_brief:...]] to generate a reasoning brief for any card — the "show your work" artifact
- Every orchestrated action generates a brief. The user can always inspect WHY you made a routing decision
- The brief is the handshake contract between human and agent: full transparency on what context was assembled and what reasoning was applied
- Think of yourself as the convergence layer between Kanban state, contact relationships, and the relay protocol

**7. Relay Preferences Awareness:**
- Before sending relays, check the recipient's relay preferences (mode, ambient/broadcast opt-ins, topic filters, quiet hours)
- Respect connections who have limited or turned off relay participation
- If a connection has "autoRespondAmbient" enabled, expect faster ambient responses from their agent`;

  return text;
}

async function layer18_profileAwareness_optimized(
  userId: string,
  connections: Awaited<ReturnType<typeof prisma.connection.findMany>>,
): Promise<string> {
  try {
    const ownProfile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!ownProfile) return '## Profile\nUser has not set up their profile yet. If they mention personal details (skills, languages, countries lived in, values, etc.), suggest using [[update_profile:{...}]] to save it.';

    const parse = (v: string | null, fallback: any = []) => {
      if (!v) return fallback;
      try { return JSON.parse(v); } catch { return fallback; }
    };

    let prompt = '## User Profile (Layer 18)\n\n';
    prompt += '### Your Owner\'s Profile\n';
    if (ownProfile.headline) prompt += `**Headline:** ${ownProfile.headline}\n`;
    if (ownProfile.bio) prompt += `**Bio:** ${ownProfile.bio}\n`;

    const skills = parse(ownProfile.skills);
    if (skills.length) prompt += `**Skills:** ${skills.join(', ')}\n`;

    const languages = parse(ownProfile.languages);
    if (languages.length) prompt += `**Languages:** ${languages.map((l: any) => `${l.language} (${l.proficiency})`).join(', ')}\n`;

    const countries = parse(ownProfile.countriesLived);
    if (countries.length) prompt += `**Countries lived in:** ${countries.map((c: any) => `${c.country}${c.context ? ` (${c.context})` : ''}`).join(', ')}\n`;

    const values = parse(ownProfile.personalValues);
    if (values.length) prompt += `**Values:** ${values.join(', ')}\n`;

    const superpowers = parse(ownProfile.superpowers);
    if (superpowers.length) prompt += `**Superpowers:** ${superpowers.join(', ')}\n`;

    const taskTypes = parse(ownProfile.taskTypes);
    if (taskTypes.length) prompt += `**Task types willing to receive:** ${taskTypes.join(', ')}\n`;

    prompt += `**Capacity:** ${ownProfile.capacity}`;
    if (ownProfile.capacityNote) prompt += ` — ${ownProfile.capacityNote}`;
    prompt += '\n';
    if (ownProfile.timezone) prompt += `**Timezone:** ${ownProfile.timezone}\n`;

    // Use pre-fetched connections instead of re-querying
    if (connections.length > 0) {
      const peerIds = connections.map(c => (c as any).requesterId === userId ? (c as any).accepterId : (c as any).requesterId).filter((id: string | null): id is string => !!id);
      const peerProfiles = await prisma.userProfile.findMany({
        where: { userId: { in: peerIds }, NOT: { visibility: 'private' } },
      });

      if (peerProfiles.length > 0) {
        prompt += '\n### Connected Users\' Profiles (for relay routing)\n';
        prompt += 'Use this to decide WHO is best suited for a task based on skills, lived experience, AND availability:\n\n';

        for (const pp of peerProfiles) {
          const conn = connections.find(c => ((c as any).requesterId === userId ? (c as any).accepterId : (c as any).requesterId) === pp.userId);
          const peer = conn ? ((conn as any).requesterId === userId ? (conn as any).accepter : (conn as any).requester) : null;
          const nickname = conn ? ((conn as any).requesterId === userId ? conn.nickname : conn.peerNickname) : null;
          const name = nickname || peer?.name || 'Unknown';

          prompt += `**${name}** — ${pp.capacity}`;
          if (pp.headline) prompt += ` | ${pp.headline}`;
          prompt += '\n';

          const pSkills = parse(pp.skills);
          if (pSkills.length) prompt += `  Skills: ${pSkills.slice(0, 8).join(', ')}\n`;

          const pLangs = parse(pp.languages);
          if (pLangs.length) prompt += `  Languages: ${pLangs.map((l: any) => l.language).join(', ')}\n`;

          const pCountries = parse(pp.countriesLived);
          if (pCountries.length) prompt += `  Lived in: ${pCountries.map((c: any) => c.country).join(', ')}\n`;

          const pSuperpowers = parse(pp.superpowers);
          if (pSuperpowers.length) prompt += `  Superpowers: ${pSuperpowers.join(', ')}\n`;

          const pTaskTypes = parse(pp.taskTypes);
          if (pTaskTypes.length) prompt += `  Accepts task types: ${pTaskTypes.join(', ')}\n`;

          prompt += '\n';
        }

        prompt += '**Routing Rules:**\n';
        prompt += '- When user asks "who should handle X?", consider skills + lived experience + task types + availability\n';
        prompt += '- Match the relay intent/task category against each person\'s self-identified task types first\n';
        prompt += '- Someone who LIVED in a country understands its culture better than someone who just speaks the language\n';
        prompt += '- Capacity "unavailable" or "busy" means route elsewhere unless specifically requested\n';
        prompt += '- Superpowers indicate what someone is uniquely good at — prioritize these for matching\n';
        prompt += '- If someone hasn\'t listed a task type, they may still be capable — but prefer people who explicitly opted in\n';
      }
    }

    prompt += '\n**Profile Learning:** When the user mentions personal details in conversation, use [[update_profile:{...}]] to save them.';

    return prompt;
  } catch (e) {
    console.error('Layer 18 (profile) error:', e);
    return '';
  }
}


// ─── Layer 19: Agent Extensions ──────────────────────────────────────────────
// Loads installed extensions (skills, personas, prompt layers) for the current user.
// Extensions can be scoped to user, team, project, or global.

interface ExtensionConfig {
  promptText?: string;
  actionTags?: Array<{
    name: string;
    description: string;
    syntax: string;
  }>;
  parameters?: Record<string, any>;
  model?: string;
}

async function layer19_agentExtensions(userId: string): Promise<string> {
  try {
    // Get user's team and project memberships to resolve scoped extensions
    const [teamMemberships, projectMemberships] = await Promise.all([
      prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      }),
      prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      }),
    ]);

    const teamIds = teamMemberships.map(m => m.teamId);
    const projectIds = projectMemberships.map(m => m.projectId);

    // Fetch all active extensions matching user's scope
    const extensions = await prisma.agentExtension.findMany({
      where: {
        isActive: true,
        OR: [
          { scope: 'user', installedById: userId },
          { scope: 'global' },
          ...(teamIds.length > 0 ? [{ scope: 'team', scopeId: { in: teamIds } }] : []),
          ...(projectIds.length > 0 ? [{ scope: 'project', scopeId: { in: projectIds } }] : []),
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    if (extensions.length === 0) return '';

    let prompt = `## Layer 19: Agent Extensions (${extensions.length} active)\n`;
    prompt += `The following extensions augment your capabilities. Apply them according to their scope.\n\n`;

    for (const ext of extensions) {
      let config: ExtensionConfig = {};
      try { config = JSON.parse(ext.config); } catch { continue; }

      const scopeLabel = ext.scope === 'user' ? '👤 Personal'
        : ext.scope === 'team' ? '👥 Team'
        : ext.scope === 'project' ? '📋 Project'
        : '🌐 Global';

      prompt += `### 🧩 ${ext.name} (${ext.type}) — ${scopeLabel}\n`;
      if (ext.description) prompt += `${ext.description}\n`;
      if (ext.source !== 'manual') prompt += `Source: ${ext.source}${ext.sourceUrl ? ` (${ext.sourceUrl})` : ''}\n`;

      // Inject prompt text
      if (config.promptText) {
        prompt += `\n${config.promptText}\n`;
      }

      // Document extension action tags
      if (config.actionTags && config.actionTags.length > 0) {
        prompt += `\n**Extension Action Tags:**\n`;
        for (const tag of config.actionTags) {
          prompt += `- \`${tag.syntax}\` — ${tag.description}\n`;
        }
      }

      // Document parameters
      if (config.parameters && Object.keys(config.parameters).length > 0) {
        prompt += `\n**Parameters:** ${JSON.stringify(config.parameters)}\n`;
      }

      prompt += '\n';
    }

    return prompt;
  } catch (e) {
    console.error('Layer 19 (extensions) error:', e);
    return '';
  }
}