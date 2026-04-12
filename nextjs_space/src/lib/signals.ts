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
    triagePrompt: `Triage my email inbox. First, review my existing Board and Queue for context — update existing cards rather than creating duplicates.\n\nFor each recent/unread email:\n1. Identify if it requires action, is informational, or can be archived\n2. Check if a related card already exists on the Board. If yes → UPDATE it with the new email context (add details, adjust priority/status). If no → create a new card only if it's genuinely new work.\n3. For emails needing a reply: draft a response and queue it for my approval\n4. For meeting requests: check my calendar and propose times\n5. Summarize: what was UPDATED (with card IDs), what was NEWLY CREATED, and what was skipped.`,
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
    triagePrompt: `Triage my calendar. First, cross-reference with my existing Board — many meetings may already have related cards.\n\nFor each event:\n1. Check if a related card already exists (meeting prep, follow-up, etc.). If yes → UPDATE it with the latest context (e.g., new attendees, agenda changes, add prep notes). If no → create a new card only for genuinely untracked items.\n2. Flag scheduling conflicts or back-to-back meetings without buffer\n3. Suggest optimal times for deep work based on gaps\n4. For past meetings without follow-up: check if a follow-up card exists first before creating\n5. Summarize: what was UPDATED, what was NEWLY CREATED, and schedule outlook.`,
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
    triagePrompt: `Triage my recent recordings and transcripts. Cross-reference with my existing Board first.\n\nFor each recording:\n1. Extract action items and commitments. For each, check if a related card already exists — UPDATE it with the new commitment/action item context rather than creating a duplicate.\n2. Identify decisions that were made and log them (update existing cards if relevant)\n3. Flag any follow-ups that are overdue or approaching deadline — update their priority/status on existing cards\n4. Only create NEW cards for genuinely new action items not already tracked\n5. Summarize: what was UPDATED, what was NEWLY CREATED, and key takeaways.`,
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
    triagePrompt: `Triage my CRM and contacts. Cross-reference with my existing Board — many follow-ups may already be tracked.\n\n1. Identify contacts I haven't engaged with recently who are important\n2. Flag any relationship signals from recent emails or meetings\n3. For follow-ups needed: check if a card already exists for that contact/relationship. If yes → UPDATE it with fresh context. If no → create a new card.\n4. Suggest introductions that could be valuable\n5. Summarize: what was UPDATED, what was NEWLY CREATED, and overall relationship health.`,
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
    triagePrompt: `Triage my Drive and documents. Cross-reference with my existing Board first.\n\n1. Identify documents that need my review or input\n2. Flag stale drafts that should be completed or archived\n3. Surface documents related to my active kanban cards — UPDATE those cards with document links/context\n4. Only create NEW cards for document tasks not already tracked on the Board\n5. Summarize: what was UPDATED, what was NEWLY CREATED, and what needs attention.`,
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
    triagePrompt: `Triage my network and connections. Cross-reference with my existing Board.\n\n1. Surface any unanswered connection requests or relay messages\n2. Check for project invites that need response\n3. Identify collaboration opportunities from the network\n4. For action items: check if a related card already exists — UPDATE it. Only create NEW cards for genuinely untracked items.\n5. Summarize: what was UPDATED, what was NEWLY CREATED, and network activity overview.`,
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
  if (!signal) return `Triage my ${signalId} — review recent activity and cross-reference with my existing Board. Update existing cards with new context before creating new ones. Only create new kanban cards for genuinely untracked items. Summarize what was updated vs. newly created.`;
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

  return `Catch me up on everything. Triage my connected signals in this priority order:\n\n${signalList}\n\n**IMPORTANT — Update first, create second.** You have my full Board and Queue context. Cross-reference everything against existing cards before creating new ones.\n\nFor each signal (${signalNames}):\n1. Review what's new or changed since we last caught up\n2. Cross-reference against existing Board cards — UPDATE cards with new context, adjust priorities/statuses, add checklist items where things have progressed\n3. Only CREATE new kanban cards for genuinely new items not already tracked in any form\n4. Queue any outbound actions (email replies, meeting scheduling) for my approval — but check if similar actions are already queued\n5. Flag anything urgent that needs immediate attention\n\nGive me a structured summary organized by signal source in the priority order above. For each signal, clearly show: ✏️ UPDATED (card ID + what changed), ➕ NEW (what was created), ⏭️ SKIPPED (already handled). End with your recommended priorities for what I should focus on right now.`;
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
