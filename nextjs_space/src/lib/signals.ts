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
    triagePrompt: `Triage my email inbox. Review my recent and unread emails and for each one:\n1. Identify if it requires action, is informational, or can be archived\n2. For action items: create a kanban card with appropriate priority and deadline\n3. For emails needing a reply: draft a response and queue it for my approval\n4. For meeting requests: check my calendar and propose times\n5. Summarize what you found and what you've queued up for me.`,
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
    triagePrompt: `Triage my calendar. Review my upcoming schedule and for each event:\n1. Identify meetings that need prep work — create prep cards on the kanban\n2. Flag scheduling conflicts or back-to-back meetings without buffer\n3. Suggest optimal times for deep work based on gaps\n4. For past meetings without follow-up: create follow-up cards\n5. Summarize my schedule outlook and what you've queued up.`,
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
    triagePrompt: `Triage my recent recordings and transcripts. For each one:\n1. Extract all action items and commitments — create kanban cards for each\n2. Identify decisions that were made and log them\n3. Flag any follow-ups that are overdue or approaching deadline\n4. Note any topics that need further discussion\n5. Summarize key takeaways and what you've added to my board.`,
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
    triagePrompt: `Triage my CRM and contacts. Review my relationships and:\n1. Identify contacts I haven't engaged with recently who are important\n2. Flag any relationship signals from recent emails or meetings\n3. Suggest introductions that could be valuable\n4. Create follow-up cards for relationships that need nurturing\n5. Summarize relationship health and what needs attention.`,
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
    triagePrompt: `Triage my Drive and documents. Review recent activity and:\n1. Identify documents that need my review or input\n2. Flag stale drafts that should be completed or archived\n3. Surface documents related to my active kanban cards\n4. Create cards for any document-related tasks\n5. Summarize what needs attention in my documents.`,
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
    triagePrompt: `Triage my network and connections. Review recent activity and:\n1. Surface any unanswered connection requests or relay messages\n2. Check for project invites that need response\n3. Identify collaboration opportunities from the network\n4. Create cards for any network-related action items\n5. Summarize network activity and what needs my attention.`,
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

export function getSignalTriagePrompt(signalId: string): string {
  const signal = getSignalById(signalId);
  if (!signal) return `Triage my ${signalId} — review recent activity and surface anything that needs my attention. Create kanban cards for action items.`;
  return signal.triagePrompt;
}

export function getCatchUpPrompt(): string {
  return `Catch me up on everything. Triage ALL my connected signals — email, calendar, recordings, CRM, drive, and network. For each source:

1. Review what's new or changed since we last caught up
2. Identify action items, deadlines, and decisions needed
3. Create kanban cards for anything that needs tracking
4. Queue any outbound actions (email replies, meeting scheduling) for my approval
5. Flag anything urgent that needs immediate attention

Give me a structured summary organized by signal source, starting with the most urgent items. End with your recommended priorities for what I should focus on right now.`;
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
