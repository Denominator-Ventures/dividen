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
  cardTypes: string[];                    // Types of kanban cards this generates
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
    triagePrompt: `Triage my email inbox. Cross-reference every email against my existing Board (check card titles, descriptions, and artifact counts like 📧3).\n\nFor each recent/unread email:\n1. **MATCH**: Does this email relate to an existing card? Check subject lines, senders, and topics against Board cards.\n2. **If match found**: UPDATE the card with new context AND [[link_artifact:{"cardId":"...","type":"email","artifactId":"EMAIL_ID"}]] to link the email.\n3. **If no match**: Create a new card only if it's genuinely new work, then immediately link the email to it.\n4. For emails needing a reply: draft a response and queue it via [[queue_capability_action:{}]]\n5. For meeting requests: check my calendar and propose times\n6. **Learn**: If you notice patterns (e.g., emails from a domain always map to the same card), save them with [[save_learning:{}]]\n7. Summarize: ✏️ Updated (with card IDs) | 🔗 Linked | ➕ Created | ⏭️ Skipped`,
    cardTypes: ['Follow-up', 'Reply needed', 'Meeting request', 'Action item', 'Decision needed', 'FYI'],
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
    triagePrompt: `Triage my calendar. Cross-reference every event against my existing Board (check card titles and 📅 counts).\n\nFor each event:\n1. **MATCH**: Does this event relate to an existing card? (meeting prep, project milestone, follow-up, etc.)\n2. **If match found**: UPDATE the card AND [[link_artifact:{"cardId":"...","type":"calendar_event","artifactId":"EVENT_ID"}]] to link the event.\n3. **If no match**: Create a new card only for genuinely untracked items, then link the event.\n4. Flag scheduling conflicts or back-to-back meetings without buffer\n5. Suggest optimal times for deep work based on gaps\n6. For past meetings without follow-up: check if a follow-up card exists first\n7. **Learn**: Save scheduling patterns (e.g., "recurring 1:1 with X always needs prep card") with [[save_learning:{}]]\n8. Summarize: ✏️ Updated | 🔗 Linked | ➕ Created | ⏭️ Skipped | 📊 Schedule outlook`,
    cardTypes: ['Meeting prep', 'Follow-up', 'Schedule conflict', 'Deep work block', 'Reschedule needed'],
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
    triagePrompt: `Triage my recent recordings and transcripts. Cross-reference every recording against my existing Board (check card titles and 🎙️ counts).\n\nFor each recording:\n1. **MATCH**: Extract action items and commitments. For each, check if a related card exists on the Board.\n2. **If match found**: UPDATE the card with new context AND [[link_artifact:{"cardId":"...","type":"recording","artifactId":"RECORDING_ID"}]] to link the recording.\n3. **If no match**: Create a new card only for genuinely new action items, then link the recording.\n4. Identify decisions made and log them on the relevant cards\n5. Flag overdue or approaching-deadline follow-ups — update their priority/status\n6. **Learn**: Save patterns (e.g., "meetings with Team X always produce 3+ action items") with [[save_learning:{}]]\n7. Summarize: ✏️ Updated | 🔗 Linked | ➕ Created | ⏭️ Skipped | 📝 Key takeaways`,
    cardTypes: ['Action item', 'Decision log', 'Follow-up', 'Discussion needed', 'Commitment tracking'],
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
    triagePrompt: `Triage my CRM and contacts. Cross-reference every contact against my existing Board (check card titles and 👤 counts).\n\n1. **MATCH**: For each contact with recent activity, check if they're already linked to a Board card.\n2. **If match found**: UPDATE the card with relationship context AND [[link_artifact:{"cardId":"...","type":"contact","artifactId":"CONTACT_ID"}]] if not already linked.\n3. **If no match**: Create a new card only for genuinely new follow-ups, then link the contact.\n4. Identify contacts I haven't engaged with recently who are important\n5. Flag relationship signals from recent emails or meetings\n6. Suggest introductions that could be valuable\n7. **Learn**: Save relationship patterns (e.g., "contact X is key stakeholder for Project Y") with [[save_learning:{}]]\n8. Summarize: ✏️ Updated | 🔗 Linked | ➕ Created | ⏭️ Skipped | 💚 Relationship health`,
    cardTypes: ['Follow-up', 'Introduction', 'Relationship nurture', 'Check-in needed'],
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
    triagePrompt: `Triage my Drive and documents. Cross-reference every document against my existing Board (check card titles and 📄 counts).\n\n1. **MATCH**: For each document, check if it relates to an existing Board card.\n2. **If match found**: UPDATE the card AND [[link_artifact:{"cardId":"...","type":"document","artifactId":"DOC_ID"}]] to link the document.\n3. **If no match**: Create a new card only for genuinely new document tasks, then link the document.\n4. Identify documents that need my review or input\n5. Flag stale drafts that should be completed or archived\n6. **Learn**: Save patterns (e.g., "weekly reports always link to the Operations card") with [[save_learning:{}]]\n7. Summarize: ✏️ Updated | 🔗 Linked | ➕ Created | ⏭️ Skipped | 📋 Needs attention`,
    cardTypes: ['Review needed', 'Draft completion', 'Document update', 'Share/publish'],
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
    triagePrompt: `Triage my network and connections. Cross-reference every signal against my existing Board.\n\n1. **MATCH**: For each connection request, relay, or invite, check if it relates to an existing Board card.\n2. **If match found**: UPDATE the card with network context AND link relevant artifacts (contacts via [[link_artifact:{"cardId":"...","type":"contact","artifactId":"..."}]], comms via type "comms").\n3. **If no match**: Create a new card only for genuinely untracked items, then link artifacts.\n4. Surface unanswered connection requests or relay messages\n5. Check for project invites that need response\n6. Identify collaboration opportunities\n7. **Learn**: Save network patterns (e.g., "relays from X are always high-priority") with [[save_learning:{}]]\n8. Summarize: ✏️ Updated | 🔗 Linked | ➕ Created | ⏭️ Skipped | 🌐 Network activity`,
    cardTypes: ['Connection response', 'Relay follow-up', 'Project invite', 'Collaboration opportunity'],
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
  if (!signal) return `Triage my ${signalId} — cross-reference every item against my existing Board. For matches: UPDATE the card + [[link_artifact:{}]] to link the artifact. Only CREATE new cards for genuinely untracked items, then link artifacts immediately. Save any triage patterns you notice with [[save_learning:{}]]. Summarize: ✏️ Updated | 🔗 Linked | ➕ Created | ⏭️ Skipped.`;
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
  const signalNames = enabledSignals.map(s => s.name.toLowerCase()).join(', ');

  return `Catch me up on everything. Triage my connected signals in this priority order:\n\n${signalList}\n\n**The Board is your source of truth.** You have my full Board context above — card IDs, titles, statuses, artifact counts (📧📄🎙️📅👤💬), assignees, and checklist progress. Cross-reference EVERYTHING against existing cards.\n\nFor each signal (${signalNames}):\n1. Review what's new or changed since we last caught up\n2. **MATCH → UPDATE + LINK**: Cross-reference against Board cards. UPDATE cards with new context AND [[link_artifact:{}]] to connect each artifact to its card.\n3. **CREATE (sparingly)**: Only for genuinely new items. Immediately link the triggering artifact.\n4. **ASSIGN**: Ensure every card has an owner (human or agent). Use [[task_route:{}]] for tasks needing outside help.\n5. Queue outbound actions via [[queue_capability_action:{}]] — check for existing queued actions first.\n6. Flag anything urgent.\n7. **LEARN**: Save any patterns you notice across signals with [[save_learning:{}]].\n\nStructured summary per signal (priority order):\n✏️ **Updated** (card ID + what changed)\n🔗 **Linked** (artifacts → cards)\n➕ **Created** (new cards + why)\n⏭️ **Skipped** (already handled)\n🔥 **Urgent** (needs immediate attention)\n\nEnd with: **🎯 Recommended NOW focus** — the 2-3 things that move my goals forward fastest.`;
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
