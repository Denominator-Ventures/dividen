/**
 * Signals — Unified incoming information sources for DiviDen.
 *
 * A Signal is any source of incoming information that Divi can triage,
 * analyze, and turn into actionable kanban cards + queue tasks.
 *
 * Each signal has:
 * - Inbound: what data comes IN from this source
 * - Capabilities: what Divi can DO outbound through this source
 * - Triage prompt: what Divi should do when triaging this signal
 */

export interface SignalDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;                   // What this signal IS
  inboundDescription: string;             // What data comes in
  triagePrompt: string;                   // What Divi does during triage
  cardTypes: string[];                    // Legacy — renamed conceptually to task types that this signal produces
  taskTypes: string[];                   // Types of tasks this signal typically produces (routed to project cards as checklist items)
  capabilities: SignalCapability[];        // Outbound actions available
  setupPath: string;                       // Where to connect this signal
  category: 'communication' | 'meetings' | 'content' | 'data';
}

export interface SignalCapability {
  id: string;
  name: string;
  description: string;
  identityOptions: ('operator' | 'agent' | 'both')[];
  defaultRules: { label: string; enabled: boolean }[];
}

// ─── Signal Definitions ──────────────────────────────────────────────────────

export const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    id: 'email',
    name: 'Email',
    icon: '📧',
    description: 'Your email inbox — the primary source of external communication, requests, and action items.',
    inboundDescription: 'New emails, threads, replies, scheduling requests, action items embedded in conversations, follow-up reminders.',
    triagePrompt: `Triage my email inbox. Every email is a potential task — extract what needs to happen, then route it.\n\nFor each recent/unread email:\n1. **EXTRACT TASKS**: What action does this email require? "Reply to X about Y", "Review attached doc", "Schedule meeting with Z", etc.\n2. **ROUTE**: Does this task belong to an existing project on my Board? Check card titles, descriptions, artifact counts (📧). If yes → add as a checklist item with source context, link the email artifact.\n3. **NEW PROJECT**: If this task doesn't fit any existing project, create a new project card (name it after the initiative/relationship, NOT the task). Add the task as the first checklist item.\n4. For emails needing a reply: draft a response and queue it via [[queue_capability_action:{}]]\n5. For meeting requests: check my calendar and propose times\n6. **Learn**: Save routing patterns with [[save_learning:{}]] (e.g., "emails from @acme.com route to Acme Partnership")\n7. Summarize: 📋 Tasks routed | 🆕 New projects | 🔗 Artifacts linked | ⏭️ Skipped`,
    cardTypes: ['Follow-up', 'Reply needed', 'Meeting request', 'Action item', 'Decision needed', 'FYI'],
    taskTypes: ['Reply to email', 'Review attachment', 'Schedule meeting', 'Follow up', 'Make decision', 'Forward/delegate', 'Archive/acknowledge'],
    capabilities: [
      {
        id: 'send_email',
        name: 'Outbound Email',
        description: 'Draft and send email replies or new emails on your behalf.',
        identityOptions: ['operator', 'agent', 'both'],
        defaultRules: [
          { label: 'Always get my approval before sending to new contacts', enabled: true },
          { label: 'Match my tone and writing style', enabled: true },
          { label: 'CC me on emails sent as Divi', enabled: true },
          { label: 'Never send cold outreach without explicit approval', enabled: true },
          { label: 'Auto-approve routine acknowledgment replies', enabled: false },
          { label: 'Flag emails that might need legal review', enabled: true },
        ],
      },
    ],
    setupPath: '/settings#integrations',
    category: 'communication',
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: '📅',
    description: 'Your calendar — meetings, events, and time blocks that shape your day.',
    inboundDescription: 'Upcoming meetings, new invitations, schedule changes, meeting prep needs, follow-up items from past meetings.',
    triagePrompt: `Triage my calendar. Every event produces tasks — extract and route them.\n\nFor each event:\n1. **EXTRACT TASKS**: "Prepare agenda for X meeting", "Send follow-up from yesterday's call", "Block time for deep work on Y", etc.\n2. **ROUTE**: Does this task belong to an existing project? Meetings about Acme → route to Acme project card. If yes → add checklist item + link calendar event artifact.\n3. **NEW PROJECT**: Only when the meeting represents a genuinely new initiative. Name the project, not the meeting.\n4. Flag scheduling conflicts or back-to-back meetings without buffer\n5. Suggest optimal deep work times based on gaps\n6. For past meetings: check if follow-up tasks are already tracked before adding\n7. **Learn**: Save patterns (e.g., "1:1 with Sarah always produces 2-3 action items for Product Roadmap card") with [[save_learning:{}]]\n8. Summarize: 📋 Tasks routed | 🆕 New projects | 🔗 Artifacts linked | ⏭️ Skipped | 📊 Schedule outlook`,
    cardTypes: ['Meeting prep', 'Follow-up', 'Schedule conflict', 'Deep work block', 'Reschedule needed'],
    taskTypes: ['Prepare for meeting', 'Send follow-up', 'Review notes/decisions', 'Reschedule', 'Block focus time', 'Decline/accept invite'],
    capabilities: [
      {
        id: 'schedule_meeting',
        name: 'Meeting Scheduling',
        description: 'Schedule meetings, propose times, and manage calendar invites.',
        identityOptions: ['operator', 'agent', 'both'],
        defaultRules: [
          { label: 'No meetings before 9am or after 6pm', enabled: true },
          { label: 'Always keep 15min buffer between meetings', enabled: true },
          { label: 'Protect focus blocks — never book over them', enabled: true },
          { label: 'Auto-accept recurring 1:1s with direct reports', enabled: false },
          { label: 'Propose 3 time options when scheduling externally', enabled: true },
          { label: 'Decline meetings without agendas after 2nd reminder', enabled: false },
        ],
      },
    ],
    setupPath: '/settings#integrations',
    category: 'meetings',
  },
  {
    id: 'recordings',
    name: 'Recordings & Transcripts',
    icon: '🎙️',
    description: 'Meeting recordings and transcripts — the source of action items, decisions, and commitments.',
    inboundDescription: 'Meeting transcripts, action items, decisions made, commitments given, follow-up tasks, key topics discussed.',
    triagePrompt: `Triage my recent recordings and transcripts. Every recording contains tasks — extract and route them.\n\nFor each recording:\n1. **EXTRACT TASKS**: Pull out every action item, commitment, and decision. "Send proposal to client", "Update pricing model", "Schedule follow-up with legal", etc.\n2. **ROUTE**: Each task belongs to a project. "Update pricing model" → route to Pricing Strategy card. Add checklist item + link recording artifact.\n3. **NEW PROJECT**: Only when a recording reveals a genuinely new initiative not yet on the Board.\n4. Log key decisions on relevant project cards (update descriptions)\n5. Flag overdue or approaching-deadline tasks — update priority/status\n6. **Learn**: Save patterns (e.g., "team standups always produce tasks for Sprint Board card") with [[save_learning:{}]]\n7. Summarize: 📋 Tasks extracted & routed | 🆕 New projects | 🔗 Artifacts linked | 📝 Key decisions`,
    cardTypes: ['Action item', 'Decision log', 'Follow-up', 'Discussion needed', 'Commitment tracking'],
    taskTypes: ['Complete action item', 'Send follow-up', 'Log decision', 'Track commitment', 'Escalate blocker', 'Research topic'],
    capabilities: [],
    setupPath: '/settings#integrations',
    category: 'meetings',
  },
  {
    id: 'crm',
    name: 'CRM & Contacts',
    icon: '👥',
    description: 'Your relationship network — contacts, interactions, and relationship health signals.',
    inboundDescription: 'New contacts, relationship activity, stale relationships needing attention, networking opportunities, introduction requests.',
    triagePrompt: `Triage my CRM and contacts. Every relationship signal is a potential task.\n\n1. **EXTRACT TASKS**: "Follow up with Sarah (2 weeks since last contact)", "Send intro email connecting X and Y", "Check in with key investor Z", etc.\n2. **ROUTE**: Each relationship task belongs to a project. "Follow up with Sarah about Acme" → Acme Partnership card. Add checklist item + link contact artifact.\n3. **NEW PROJECT**: Only for genuinely new relationships/initiatives worth tracking as a project.\n4. Identify contacts I haven't engaged with who are important — create follow-up tasks on their relevant project cards\n5. Suggest introductions that could be valuable\n6. **Learn**: Save relationship patterns (e.g., "contact Sarah is key stakeholder for Acme card") with [[save_learning:{}]]\n7. Summarize: 📋 Tasks routed | 🆕 New projects | 🔗 Contacts linked | 💚 Relationship health`,
    cardTypes: ['Follow-up', 'Introduction', 'Relationship nurture', 'Check-in needed'],
    taskTypes: ['Follow up with contact', 'Send introduction', 'Schedule check-in', 'Update contact info', 'Nurture relationship', 'Request referral'],
    capabilities: [],
    setupPath: '/settings#integrations',
    category: 'data',
  },
  {
    id: 'drive',
    name: 'Drive & Documents',
    icon: '📁',
    description: 'Your documents and files — notes, reports, templates, and shared resources.',
    inboundDescription: 'New documents, shared files, documents needing review, stale drafts, collaborative edits.',
    triagePrompt: `Triage my Drive and documents. Every document needing attention is a task.\n\n1. **EXTRACT TASKS**: "Review Q4 budget doc", "Complete draft proposal", "Update onboarding guide", "Share report with team", etc.\n2. **ROUTE**: Each task belongs to a project. "Review Q4 budget doc" → Q4 Planning card. Add checklist item + link document artifact.\n3. **NEW PROJECT**: Only for documents that represent genuinely new initiatives.\n4. Flag stale drafts that should be completed or archived\n5. Surface docs related to active high-priority projects\n6. **Learn**: Save patterns (e.g., "weekly reports always produce a review task for Operations card") with [[save_learning:{}]]\n7. Summarize: 📋 Tasks routed | 🆕 New projects | 🔗 Documents linked | 📋 Stale drafts flagged`,
    cardTypes: ['Review needed', 'Draft completion', 'Document update', 'Share/publish'],
    taskTypes: ['Review document', 'Complete draft', 'Update document', 'Share/publish', 'Archive stale doc', 'Comment/annotate'],
    capabilities: [],
    setupPath: '/settings#integrations',
    category: 'content',
  },
  {
    id: 'connections',
    name: 'Network & Connections',
    icon: '🔗',
    description: 'Your DiviDen network — connections, relays, project invites, and collaboration signals.',
    inboundDescription: 'New connection requests, relay messages, project invites, team updates, job opportunities, collaboration requests.',
    triagePrompt: `Triage my network and connections. Every network signal is a potential task.\n\n1. **EXTRACT TASKS**: "Respond to connection request from X", "Review project invite from Y", "Follow up on relay from Z", "Explore collaboration with W", etc.\n2. **ROUTE**: Each task belongs to a project. "Follow up on relay about API integration" → API Integration card. Add checklist item + link contact/comms artifact.\n3. **NEW PROJECT**: Only for genuinely new collaborative initiatives.\n4. Surface unanswered connection requests or relay messages\n5. Check for project invites that need response\n6. Identify collaboration opportunities from the network\n7. **Learn**: Save patterns (e.g., "relays from X always relate to Product card") with [[save_learning:{}]]\n8. Summarize: 📋 Tasks routed | 🆕 New projects | 🔗 Artifacts linked | 🌐 Network activity`,
    cardTypes: ['Connection response', 'Relay follow-up', 'Project invite', 'Collaboration opportunity'],
    taskTypes: ['Respond to connection', 'Review project invite', 'Follow up on relay', 'Explore collaboration', 'Accept/decline invite', 'Route task to network'],
    capabilities: [],
    setupPath: '/settings#connections',
    category: 'communication',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getSignalById(id: string): SignalDefinition | undefined {
  return SIGNAL_DEFINITIONS.find(s => s.id === id);
}

export function getSignalTriagePrompt(signalId: string, customPrompt?: string): string {
  // Custom prompt override (for custom/webhook signals stored in DB)
  if (customPrompt) return customPrompt;
  const signal = getSignalById(signalId);
  if (!signal) return `Triage my ${signalId}. Every item is a potential task — extract what needs to happen, then route each task to the right project card on my Board. Add tasks as checklist items with source context. Link artifacts. Only create new project cards for genuinely new initiatives (name them as projects, not tasks). Save routing patterns with [[save_learning:{}]]. Summarize: 📋 Tasks routed | 🆕 New projects | 🔗 Artifacts linked | ⏭️ Skipped.`;
  return signal.triagePrompt;
}

/** Signal config from API — describes per-user priority and enabled state */
export interface SignalCatchUpConfig {
  signalId: string;
  name: string;
  icon: string;
  priority: number;
  catchUpEnabled: boolean;
}

/**
 * Build a dynamic catch-up prompt respecting the user's signal config.
 * If no config provided, falls back to all hardcoded signals.
 */
export function getCatchUpPrompt(configs?: SignalCatchUpConfig[]): string {
  let enabledSignals: { id: string; name: string; icon: string }[];

  if (configs && configs.length > 0) {
    // Filter to only catch-up-enabled signals, already sorted by priority from API
    enabledSignals = configs
      .filter(c => c.catchUpEnabled)
      .map(c => ({ id: c.signalId, name: c.name, icon: c.icon }));
  } else {
    // Fallback: all hardcoded signals
    enabledSignals = SIGNAL_DEFINITIONS.map(s => ({ id: s.id, name: s.name, icon: s.icon }));
  }

  if (enabledSignals.length === 0) {
    return 'All signals are currently excluded from catch-up. Go to Catch Up Settings to enable at least one signal.';
  }

  const signalList = enabledSignals.map((s, i) => `${i + 1}. ${s.icon} ${s.name}`).join('\n');

  return `Catch me up — walk me through everything that needs my attention. Go phase by phase:

## Phase 1 — Board & Queue Progress
Read my Board and Queue state. Give me a clear status report:
- **Completed**: What got done since last catch-up? List specifics.
- **Still pending**: What's sitting there waiting? Be direct about what matters and what doesn't.
- **Blocked / structurally wrong**: Anything stuck? Any workflow issues?
- **Your recommendation**: Is the board healthy? What needs management attention?

## Phase 2 — Inbox Triage
Look at my unread emails. Don't just count them — analyze:
- **What actually looks real**: Important threads by name, with context about why they matter and what state they're in. Use 🔴 for urgent, 🟡 for important but not urgent.
- **What I'd do next**: Your specific recommendation for inbox processing order.
- Skip newsletters and noise — only surface humans and active deals.

## Phase 3 — Calendar & Signals
Check my calendar and other connected signals (${signalList}):
- Any meetings coming up that need prep?
- Any recordings that need review?
- Anything from connected signals that changes priorities?

## Phase 4 — Recommended Focus
End with your top 2-3 recommendations for what I should focus on RIGHT NOW — the things that move the needle fastest.

**Style rules**:
- Write like a chief of staff briefing, not a system report
- Be specific — use names, project titles, thread subjects
- Be opinionated — tell me what matters and what doesn't
- Keep each phase as a separate section with a clear heading
- After each phase, ask if I want to dig deeper or move to the next one`;
}

/** Map center tab IDs to signal IDs where triage makes sense */
export const TAB_TO_SIGNAL: Record<string, string> = {
  inbox: 'email',
  calendar: 'calendar',
  recordings: 'recordings',
  crm: 'crm',
  drive: 'drive',
  connections: 'connections',
  discover: 'connections',
};
