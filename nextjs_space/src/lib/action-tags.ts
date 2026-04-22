/**
 * DiviDen Action Tag Parser & Executor
 *
 * Parses [[tag_name:params]] from AI responses and executes corresponding
 * database operations via a domain-split handler registry.
 *
 * The 68 individual tag handlers live in `src/lib/tags/handlers-*.ts` and
 * are merged into a single TAG_HANDLERS map exported from `src/lib/tags`.
 *
 * This root file owns: types, SUPPORTED_TAGS registry, TAG_ALIASES,
 * parseActionTags (regex-based tag extraction), stripActionTags /
 * sanitizeAssistantContent (content scrubbing), executeTag dispatcher,
 * and the top-level executeActionTags runner.
 */

import { TAG_HANDLERS } from './tags';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedTag {
  raw: string;           // The full matched string including [[ ]]
  name: string;          // Tag name (e.g., "create_card")
  params: Record<string, any>; // Parsed JSON parameters
}

export interface TagExecutionResult {
  tag: string;
  success: boolean;
  data?: any;
  error?: string;
}

// ─── Tag Names ───────────────────────────────────────────────────────────────

export const SUPPORTED_TAGS = [
  'create_card',
  'update_card',
  'archive_card',
  'create_contact',
  'link_contact',
  'dispatch_queue',
  'dispatch',          // alias for dispatch_queue (matches protocol spec)
  'create_event',
  'schedule_event',    // alias for create_event (matches protocol spec)
  'set_reminder',
  'send_email',
  'add_checklist',
  'add_task',          // alias for add_checklist (matches protocol spec)
  'complete_checklist',
  'update_memory',
  'save_learning',
  'add_known_person',  // register a name alias (matches protocol spec)
  // ── Platform Setup Actions ──
  'setup_webhook',     // create a webhook endpoint
  'save_api_key',      // store an LLM API key
  'create_calendar_event', // direct calendar event creation
  'create_document',   // create a document in Drive
  'send_comms',        // send a comms message from Divi
  'add_relationship',  // link two contacts with a relationship type
  'update_contact',    // update a contact's details (tags, notes, company, role, etc.)
  'link_recording',    // link a recording to a kanban card
  // ── Connection & Relay Actions ──
  'relay_request',     // send a relay to a connected user's agent
  'relay_broadcast',   // send a relay to ALL connections (ask the team / company-wide)
  'relay_ambient',     // low-priority ambient ask — receiving agent weaves it in naturally
  'accept_connection', // accept a pending connection request
  'relay_respond',     // respond to an inbound relay (complete/decline)
  'upsert_card',             // find existing card by title/context and update, or create new if not found
  'link_artifact',           // link an email, document, recording, calendar event, or contact to a kanban card
  'queue_capability_action', // queue an outbound capability action (email reply, meeting schedule)
  'update_profile',    // update user profile from conversation (skills, languages, etc.)
  // ── Orchestration Actions ──
  'task_route',        // decompose a kanban card into tasks, match skills, route to best connection
  'assemble_brief',   // manually trigger brief assembly for a kanban card
  'project_dashboard', // assemble cross-member project dashboard — see what everyone is doing
  // ── Goal Actions ──
  'create_goal',       // create a new goal
  'update_goal',       // update goal progress/status/details
  // ── Job Board Actions ──
  'post_job',          // post a task to the network job board
  'propose_task',      // propose a paying task to the queue for operator approval before posting
  'find_jobs',         // find matching tasks for this user's profile
  // ── Entity Resolution (FVP Brief #5) ──
  'entity_resolve',    // cross-surface entity resolution: find all info about a person/company
  // ── Marketplace Install/Uninstall ──
  'install_agent',     // install a marketplace agent into Divi's active toolkit
  'uninstall_agent',   // uninstall a marketplace agent from Divi's toolkit
  'suggest_marketplace', // search marketplace for agents/capabilities matching a task need
  'merge_cards',       // merge two project cards into one (combines tasks, contacts, artifacts)
  // ── Integration Sync ──
  'sync_signal',       // trigger a sync for a connected service (email, calendar, drive, or all)
  // ── Meeting Notes (Gemini) ──
  'generate_meeting_notes', // generate AI meeting notes for a calendar event using Gemini
  // ── Settings Widget (Onboarding / Anytime) ──
  'show_settings_widget', // show an interactive settings widget in chat (group: working_style | triage | goals | identity | all)
  // ── Queue Management (chat-based) ──
  'confirm_queue_item',  // approve a pending_confirmation item → ready
  'remove_queue_item',   // delete a queue item by id
  'edit_queue_item',     // update title/description/priority of a queue item (triggers smart re-optimization)
  // ── Linked Kards ──
  'link_cards',          // explicitly link two kanban cards (cross-user or same-user)
  // ── Interactive Widgets ──
  'show_google_connect', // render Google Connect button widget in chat (works outside onboarding too)
  // ── Project → Team Assignment ──
  'assign_team_to_project', // assign a project to a team (converts it to a team project)
  // ── Project Management ──
  'create_project',          // create a new project and optionally invite members
  'invite_to_project',       // invite one or more users (by name/email/connectionId) to an existing project
  // ── Introspection / Self-Test ──
  'query_relays',            // list recent relays (inbound/outbound) with status — Divi can self-check delivery
  'query_connections',       // list active connections with scopes and peer info — Divi can self-verify peer state
] as const;

// Map alias tag names to their canonical implementation
const TAG_ALIASES: Record<string, string> = {
  dispatch: 'dispatch_queue',
  schedule_event: 'create_event',
  add_task: 'add_checklist',
};

export type TagName = (typeof SUPPORTED_TAGS)[number];

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Extract all [[tag_name:params]] from a string.
 * Supports nested JSON with colons, brackets, etc.
 */
export function parseActionTags(text: string): ParsedTag[] {
  const tags: ParsedTag[] = [];

  // Match [[tag_name:{...}]] — greedy enough to capture nested JSON
  const regex = /\[\[(\w+):\s*(\{[\s\S]*?\})\s*\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const [raw, name, jsonStr] = match;

    // Only parse supported tags
    if (!SUPPORTED_TAGS.includes(name as TagName)) {
      continue;
    }

    try {
      const params = JSON.parse(jsonStr);
      tags.push({ raw, name, params });
    } catch {
      // Try to fix common JSON issues (single quotes, trailing commas)
      try {
        const fixed = jsonStr
          .replace(/'/g, '"')
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']');
        const params = JSON.parse(fixed);
        tags.push({ raw, name, params });
      } catch {
        console.warn(`[action-tags] Failed to parse params for [[${name}]]:`, jsonStr);
      }
    }
  }

  return tags;
}

/**
 * Regex patterns for fabricated summary-like content. Covers multiple
 * formats that hallucinating LLMs tend to produce:
 * - Exact "[Tag execution summary ...]...[End of tag summary]" blocks
 * - Markdown "**First summary:**", "**Second summary:**" headings
 * - "Here's the (real )?(system-injected )?(tag )?summary:" prefaced blocks
 * - Lines quoting fake backend IDs like "inviteId: cmo..." / "relayId: cmo..."
 */
const SUMMARY_PATTERNS: RegExp[] = [
  // Full server-style block
  /\[Tag execution summary[\s\S]*?\[End of tag summary[^\]]*\]/g,
  // Orphaned opening marker
  /\[Tag execution summary from your previous turn[^\]]*\][\s\S]*?(?=\n\n|$)/g,
  // Markdown fake-summary headers and the multi-line block that follows
  /\*\*(?:First|Second|Third|Another|Duplicate|Real|System-?injected)\s*summary:?\*\*[\s\S]*?(?=\n\n|\n---|$)/gi,
  // "Here's the (real) system-injected summary:" style preface
  /(?:^|\n)\s*(?:Here'?s|Below is)\s+(?:the\s+)?(?:real\s+|actual\s+)?(?:system-?injected\s+)?(?:tag\s+)?summary[:\s][\s\S]*?(?=\n\n|\n---|$)/gi,
  // Bare "summary:" heading followed by bullet list
  /(?:^|\n)\s*Summary:\s*\n(?:\s*[-•*][^\n]*\n){1,}/g,
];

/**
 * Strip all action tags from text, returning clean message for display.
 *
 * Also strips fabricated tag-summary blocks (the LLM sometimes regurgitates
 * server-injected notes in various formats). These only belong in system
 * notes injected BY the server — if they appear in assistant content, it's
 * hallucination. Stripping them prevents re-contamination of future context.
 */
export function stripActionTags(text: string): string {
  let out = text.replace(/\[\[\w+:\s*\{[\s\S]*?\}\s*\]\]/g, '');
  for (const re of SUMMARY_PATTERNS) out = out.replace(re, '');
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Sanitize assistant content before persisting to the database. Removes
 * fabricated tag-summary blocks so they don't pollute future context windows.
 * Preserves action tags themselves (we need those for replay/context), just
 * strips hallucinated summary text.
 */
export function sanitizeAssistantContent(text: string): string {
  let out = text;
  for (const re of SUMMARY_PATTERNS) out = out.replace(re, '');
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

// ─── Executor ────────────────────────────────────────────────────────────────

/**
 * Execute a single parsed action tag against the database. Delegates to the
 * handler registry after resolving aliases. Catches handler throws and
 * normalizes them into `{ success: false, error }` results.
 */
export async function executeTag(
  tag: ParsedTag,
  userId: string
): Promise<TagExecutionResult> {
  // Resolve aliases to canonical tag names
  const name = TAG_ALIASES[tag.name] || tag.name;
  const { params } = tag;

  const handler = TAG_HANDLERS[name];
  if (!handler) {
    return { tag: name, success: false, error: `Unknown tag: ${name}` };
  }

  try {
    return await handler(params, userId, name);
  } catch (error: any) {
    console.error(`[action-tags] Error executing [[${name}]]:`, error.message);
    return { tag: name, success: false, error: error.message };
  }
}

/**
 * Execute all parsed action tags and return results.
 */
export async function executeActionTags(
  tags: ParsedTag[],
  userId: string
): Promise<TagExecutionResult[]> {
  const results: TagExecutionResult[] = [];

  for (const tag of tags) {
    const result = await executeTag(tag, userId);
    results.push(result);
  }

  return results;
}
