/**
 * DiviDen Action Tag Parser & Executor
 * 
 * Parses [[tag_name:params]] from AI responses and executes
 * corresponding database operations.
 */

import { prisma } from './prisma';
import { deduplicatedQueueCreate } from './queue-dedup';
import { pushRelayStateChanged } from './webhook-push';
import { getPlatformFeePercent } from './marketplace-config';
import { checkQueueGate, searchMarketplaceSuggestions } from './queue-gate';
import { optimizeTaskForAgent } from './smart-task-prompter';
import { checkAndAutoCompleteCard } from './card-auto-complete';
import { logActivity } from './activity';

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
 * Strip all action tags from text, returning clean message for display.
 */
export function stripActionTags(text: string): string {
  return text
    .replace(/\[\[\w+:\s*\{[\s\S]*?\}\s*\]\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Executor ────────────────────────────────────────────────────────────────

/**
 * Execute a single parsed action tag against the database.
 */
export async function executeTag(
  tag: ParsedTag,
  userId: string
): Promise<TagExecutionResult> {
  // Resolve aliases to canonical tag names
  const name = TAG_ALIASES[tag.name] || tag.name;
  const { params } = tag;

  try {
    switch (name) {
      // ── Card Management ──────────────────────────────────────────────
      case 'create_card': {
        const card = await prisma.kanbanCard.create({
          data: {
            title: params.title || 'Untitled Card',
            description: params.description || null,
            status: params.status || 'leads',
            priority: params.priority || 'medium',
            dueDate: params.dueDate ? new Date(params.dueDate) : null,
            userId,
          },
        });
        // v2: Auto-link from relay context (deterministic) or manual override
        const { autoLinkFromRelay } = await import('./card-links');
        await autoLinkFromRelay(card.id, userId, {
          linkedFromCardId: params.linkedFromCardId,
          relayId: params.relayId,
          linkType: params.linkType,
        });
        return { tag: name, success: true, data: { id: card.id, title: card.title } };
      }

      case 'update_card': {
        if (!params.id) return { tag: name, success: false, error: 'Missing card id' };
        const updateData: any = {};
        if (params.title) updateData.title = params.title;
        if (params.description !== undefined) updateData.description = params.description;
        if (params.status) updateData.status = params.status;
        if (params.priority) updateData.priority = params.priority;
        if (params.dueDate) updateData.dueDate = new Date(params.dueDate);

        const card = await prisma.kanbanCard.update({
          where: { id: params.id },
          data: updateData,
        });
        // v2: Propagate status/priority changes to linked cards
        if (params.status || params.priority) {
          const { propagateCardStatusChange } = await import('./card-links');
          await propagateCardStatusChange(card.id, params.status, params.priority);
        }
        return { tag: name, success: true, data: { id: card.id, title: card.title } };
      }

      case 'archive_card': {
        if (!params.id) return { tag: name, success: false, error: 'Missing card id' };
        const card = await prisma.kanbanCard.update({
          where: { id: params.id },
          data: { status: 'completed' },
        });
        // v2: Propagate completion to linked cards
        const { propagateCardStatusChange: propagateArchive } = await import('./card-links');
        await propagateArchive(card.id, 'completed');
        return { tag: name, success: true, data: { id: card.id } };
      }

      // ── Upsert Card (find by title similarity, update or create) ───
      case 'upsert_card': {
        const upsertTitle = params.title || 'Untitled';
        // Search for existing cards with similar titles belonging to this user
        const existingCards = await prisma.kanbanCard.findMany({
          where: {
            userId,
            status: { notIn: ['completed', 'archived'] },
          },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        });

        // Find best match by title similarity
        let bestMatch: any = null;
        let bestSim = 0;
        const { similarity: simFn } = await import('./queue-dedup');
        for (const ec of existingCards) {
          const sim = simFn(upsertTitle, ec.title);
          if (sim > bestSim) {
            bestSim = sim;
            bestMatch = ec;
          }
        }

        // If strong match (≥80% similar), update the existing card
        if (bestMatch && bestSim >= 0.80) {
          const updateData: Record<string, any> = {};
          if (params.description) {
            // Append new context to existing description
            const existing = bestMatch.description || '';
            const newContext = params.description;
            if (existing && simFn(existing, newContext) < 0.65) {
              updateData.description = `${existing}\n\n---\n📡 Updated via triage:\n${newContext}`;
            } else if (!existing) {
              updateData.description = newContext;
            }
          }
          if (params.status) updateData.status = params.status;
          if (params.priority) updateData.priority = params.priority;
          if (params.dueDate) updateData.dueDate = new Date(params.dueDate);

          if (Object.keys(updateData).length > 0) {
            const updated = await prisma.kanbanCard.update({
              where: { id: bestMatch.id },
              data: updateData,
            });
            return {
              tag: name,
              success: true,
              data: {
                id: updated.id,
                title: updated.title,
                action: 'updated',
                similarity: `${(bestSim * 100).toFixed(0)}%`,
                fieldsUpdated: Object.keys(updateData),
              },
            };
          }
          // No new fields to update — return existing as-is
          return {
            tag: name,
            success: true,
            data: {
              id: bestMatch.id,
              title: bestMatch.title,
              action: 'unchanged',
              similarity: `${(bestSim * 100).toFixed(0)}%`,
              note: 'Card already exists and is up to date',
            },
          };
        }

        // No match — create new card
        const newCard = await prisma.kanbanCard.create({
          data: {
            title: upsertTitle,
            description: params.description || null,
            status: params.status || 'leads',
            priority: params.priority || 'medium',
            dueDate: params.dueDate ? new Date(params.dueDate) : null,
            userId,
          },
        });
        // v2: Auto-link from relay context (deterministic) or manual override
        const { autoLinkFromRelay: autoLinkUpsert } = await import('./card-links');
        await autoLinkUpsert(newCard.id, userId, {
          linkedFromCardId: params.linkedFromCardId,
          relayId: params.relayId,
          linkType: params.linkType,
        });
        return {
          tag: name,
          success: true,
          data: { id: newCard.id, title: newCard.title, action: 'created' },
        };
      }

      // ── Link Artifact (attach any entity to a kanban card) ─────────
      case 'link_artifact': {
        if (!params.cardId) return { tag: name, success: false, error: 'Missing cardId' };
        const artifactType = params.type || params.artifactType;
        const artifactId = params.artifactId || params.id;
        if (!artifactType || !artifactId) {
          return { tag: name, success: false, error: 'Missing type and artifactId' };
        }
        try {
          // Verify card exists and belongs to user
          const targetCard = await prisma.kanbanCard.findFirst({ where: { id: params.cardId, userId } });
          if (!targetCard) return { tag: name, success: false, error: 'Card not found or access denied' };

          // For known built-in types, also set the direct FK for backwards compatibility
          const BUILTIN_FK_HANDLERS: Record<string, () => Promise<void>> = {
            email: () => prisma.emailMessage.update({ where: { id: artifactId }, data: { linkedCardId: params.cardId } }).then(() => {}),
            document: () => prisma.document.update({ where: { id: artifactId }, data: { cardId: params.cardId } }).then(() => {}),
            recording: () => prisma.recording.update({ where: { id: artifactId }, data: { cardId: params.cardId } }).then(() => {}),
            calendar_event: () => prisma.calendarEvent.update({ where: { id: artifactId }, data: { cardId: params.cardId } }).then(() => {}),
            event: () => prisma.calendarEvent.update({ where: { id: artifactId }, data: { cardId: params.cardId } }).then(() => {}),
            contact: () => prisma.cardContact.upsert({
              where: { cardId_contactId: { cardId: params.cardId, contactId: artifactId } },
              update: { role: params.role || null },
              create: { cardId: params.cardId, contactId: artifactId, role: params.role || null },
            }).then(() => {}),
            comms: () => prisma.commsMessage.update({ where: { id: artifactId }, data: { linkedCardId: params.cardId } }).then(() => {}),
          };

          // Try direct FK link for built-in types (best-effort — artifact might not exist yet for webhook signals)
          const fkHandler = BUILTIN_FK_HANDLERS[artifactType];
          if (fkHandler) {
            try { await fkHandler(); } catch (_) { /* Artifact may not exist as a built-in record — fall through to generic link */ }
          }

          // Always create a generic CardArtifact record (extensible, works for ANY signal type)
          await prisma.cardArtifact.upsert({
            where: { cardId_artifactType_artifactId: { cardId: params.cardId, artifactType, artifactId } },
            update: { label: params.label || null, metadata: params.metadata ? JSON.stringify(params.metadata) : null },
            create: {
              cardId: params.cardId,
              artifactType,
              artifactId,
              label: params.label || null,
              metadata: params.metadata ? JSON.stringify(params.metadata) : null,
            },
          });

          return { tag: name, success: true, data: { cardId: params.cardId, type: artifactType, artifactId, label: params.label, note: `${artifactType} artifact linked to project card` } };
        } catch (err: any) {
          return { tag: name, success: false, error: `Failed to link artifact: ${err?.message}` };
        }
      }

      // ── Checklist ────────────────────────────────────────────────────
      case 'add_checklist': {
        if (!params.cardId || !params.text) {
          return { tag: name, success: false, error: 'Missing cardId or text' };
        }
        // Determine assignee type: "self" (operator), "divi" (Divi direct), "delegated" (another user via their Divi)
        const aType = params.assigneeType || params.assignTo || 'self';
        let assigneeType = 'self';
        let assigneeName: string | null = null;
        let assigneeId: string | null = null;
        let delegationStatus: string | null = null;

        if (aType === 'divi' || aType === 'agent') {
          assigneeType = 'divi';
          assigneeName = 'Divi';
        } else if (aType === 'delegated' || params.delegateTo) {
          assigneeType = 'delegated';
          assigneeId = params.assigneeId || params.delegateTo || null;
          assigneeName = params.assigneeName ? `${params.assigneeName} via Divi` : 'Delegated via Divi';
          delegationStatus = 'pending';
        }

        const item = await prisma.checklistItem.create({
          data: {
            cardId: params.cardId,
            text: params.text,
            order: params.order || 0,
            dueDate: params.dueDate ? new Date(params.dueDate) : null,
            sourceType: params.sourceType || null,
            sourceId: params.sourceId || null,
            sourceLabel: params.sourceLabel || null,
            assigneeType,
            assigneeName,
            assigneeId,
            delegationStatus,
          },
        });
        return { tag: name, success: true, data: { id: item.id, text: item.text, assigneeType, assigneeName, delegationStatus, dueDate: item.dueDate } };
      }

      case 'complete_checklist': {
        if (!params.id) return { tag: name, success: false, error: 'Missing checklist item id' };
        const item = await prisma.checklistItem.update({
          where: { id: params.id },
          data: { completed: params.completed !== false },
          include: { card: { select: { id: true, title: true } } },
        });
        // Log to activity feed
        await prisma.activityLog.create({
          data: {
            action: 'task_completed',
            actor: 'divi',
            summary: `Completed task: "${item.text}" on card "${(item as any).card?.title || 'unknown'}"`,
            metadata: JSON.stringify({ checklistId: item.id, cardId: (item as any).card?.id }),
            userId,
            cardId: (item as any).card?.id || null,
          },
        }).catch(() => {});
        // Auto-complete the card if all checklist items are now done
        const cardAutoCompleted = await checkAndAutoCompleteCard(item.cardId, userId);
        return { tag: name, success: true, data: { id: item.id, completed: item.completed, cardAutoCompleted } };
      }

      // ── Contacts ─────────────────────────────────────────────────────
      case 'create_contact': {
        const contact = await prisma.contact.create({
          data: {
            name: params.name || 'Unknown',
            email: params.email || null,
            phone: params.phone || null,
            company: params.company || null,
            role: params.role || null,
            notes: params.notes || null,
            tags: params.tags || null,
            source: 'chat', // Auto-created from conversation
            userId,
          },
        });

        // If a cardId is provided, automatically link the contact to the card
        if (params.cardId) {
          try {
            await prisma.cardContact.create({
              data: {
                cardId: params.cardId,
                contactId: contact.id,
                role: params.linkRole || null,
              },
            });
          } catch {
            // Ignore if link already exists
          }
        }

        return { tag: name, success: true, data: { id: contact.id, name: contact.name } };
      }

      case 'link_contact': {
        if (!params.cardId || !params.contactId) {
          // If contactId not provided but contactName is, look up or create
          if (params.cardId && params.contactName) {
            let contact = await prisma.contact.findFirst({
              where: { userId, name: { contains: params.contactName } },
            });
            if (!contact) {
              contact = await prisma.contact.create({
                data: {
                  name: params.contactName,
                  email: params.email || null,
                  source: 'chat',
                  userId,
                },
              });
            }
            // Determine involvement + delegation capability
            const involvement = params.involvement || params.as || 'related'; // "contributor" or "related"
            const isDiviUser = !!contact.platformUserId;
            const link = await prisma.cardContact.upsert({
              where: { cardId_contactId: { cardId: params.cardId, contactId: contact.id } },
              update: { role: params.role || null, involvement, canDelegate: isDiviUser },
              create: {
                cardId: params.cardId,
                contactId: contact.id,
                role: params.role || null,
                involvement,
                canDelegate: isDiviUser,
              },
            });
            return { tag: name, success: true, data: { id: link.id, contactId: contact.id, involvement, canDelegate: isDiviUser } };
          }
          return { tag: name, success: false, error: 'Missing cardId or contactId/contactName' };
        }
        try {
          // Look up contact to determine if they're a DiviDen user
          const contactRecord = await prisma.contact.findUnique({ where: { id: params.contactId }, select: { platformUserId: true } });
          const isDiviUser = !!contactRecord?.platformUserId;
          const involvement = params.involvement || params.as || 'related';
          const link = await prisma.cardContact.upsert({
            where: { cardId_contactId: { cardId: params.cardId, contactId: params.contactId } },
            update: { role: params.role || null, involvement, canDelegate: isDiviUser },
            create: {
              cardId: params.cardId,
              contactId: params.contactId,
              role: params.role || null,
              involvement,
              canDelegate: isDiviUser,
            },
          });
          return { tag: name, success: true, data: { id: link.id, involvement, canDelegate: isDiviUser } };
        } catch {
          return { tag: name, success: false, error: 'Link already exists or invalid IDs' };
        }
      }

      // ── Queue (with gating) ────────────────────────────────────────
      case 'dispatch_queue': {
        const taskTitle = params.title || 'Untitled Item';
        const taskDesc = params.description || null;
        const taskType = params.type || 'task';

        // Check user's auto-approve preference (open-source users can opt out of confirmation gate)
        const queueUser = await prisma.user.findUnique({ where: { id: userId }, select: { queueAutoApprove: true } });
        const queueStatus = queueUser?.queueAutoApprove ? 'ready' : 'pending_confirmation';

        // Queue gating: check if user has a handler for this task
        const gateResult = await checkQueueGate(userId, taskTitle, taskDesc, taskType);

        if (!gateResult.allowed) {
          // No handler available — return suggestions instead of creating queue item
          return {
            tag: name,
            success: false,
            data: {
              gated: true,
              reason: gateResult.reason,
              suggestions: gateResult.suggestions || [],
              taskTitle,
              taskDescription: taskDesc,
              message: `No installed agent or capability can handle "${taskTitle}". Would you like to browse the Bubble Store for a matching agent or capability?`,
            },
          };
        }

        // Handler found — create with user's preferred gating status
        const dedupResult = await deduplicatedQueueCreate({
          type: taskType,
          title: taskTitle,
          description: taskDesc,
          priority: params.priority || 'medium',
          source: 'agent',
          userId,
          metadata: gateResult.handler ? JSON.stringify({ handler: gateResult.handler }) : null,
          status: queueStatus,
        });
        return {
          tag: name,
          success: true,
          data: {
            id: dedupResult.item.id,
            title: dedupResult.item.title,
            handler: gateResult.handler,
            deduplicated: !dedupResult.created,
            pending_confirmation: queueStatus === 'pending_confirmation',
            ...(dedupResult.reason ? { reason: dedupResult.reason } : {}),
          },
        };
      }

      // ── Capability Actions (outbound email, meeting scheduling) ──────
      case 'queue_capability_action': {
        const capUser = await prisma.user.findUnique({ where: { id: userId }, select: { queueAutoApprove: true } });
        const capQueueStatus = capUser?.queueAutoApprove ? 'ready' : 'pending_confirmation';

        const capType = params.capabilityType || 'email';
        const action = params.action || 'outbound';
        const titleMap: Record<string, string> = {
          'email:reply': `Draft reply to ${params.recipient || 'contact'}`,
          'email:compose': `Draft email to ${params.recipient || 'contact'}`,
          'meetings:schedule': `Schedule meeting with ${params.meetingWith || 'contact'}`,
        };
        const capTitle = titleMap[`${capType}:${action}`] || params.title || `${capType} — ${action}`;

        const capMeta = JSON.stringify({
          capabilityType: capType,
          action,
          identity: params.identity || 'operator',
          recipient: params.recipient,
          subject: params.subject,
          draft: params.draft,
          meetingWith: params.meetingWith,
          proposedTime: params.proposedTime,
          duration: params.duration,
        });

        const capItem = await prisma.queueItem.create({
          data: {
            type: 'agent_suggestion',
            title: capTitle,
            description: params.subject || params.draft?.substring(0, 100) || `${capType} action`,
            priority: params.priority || 'high',
            status: capQueueStatus,
            source: 'agent',
            metadata: capMeta,
            userId,
          },
        });

        return {
          tag: name,
          success: true,
          data: { id: capItem.id, title: capItem.title, capabilityType: capType, action, pending_confirmation: capQueueStatus === 'pending_confirmation' },
        };
      }

      // ── Queue Management (chat-based) ───────────────────────────────
      case 'confirm_queue_item': {
        const qId = params.id;
        if (!qId) return { tag: name, success: false, error: 'Missing queue item id' };
        const qItem = await prisma.queueItem.findFirst({ where: { id: qId, userId } });
        if (!qItem) return { tag: name, success: false, error: 'Queue item not found' };
        if (qItem.status !== 'pending_confirmation') {
          return { tag: name, success: false, error: `Item is already "${qItem.status}", not pending_confirmation` };
        }
        const confirmed = await prisma.queueItem.update({ where: { id: qId }, data: { status: 'ready' } });
        return { tag: name, success: true, data: { id: confirmed.id, title: confirmed.title, status: 'ready' } };
      }

      case 'remove_queue_item': {
        const rId = params.id;
        if (!rId) return { tag: name, success: false, error: 'Missing queue item id' };
        const rItem = await prisma.queueItem.findFirst({ where: { id: rId, userId } });
        if (!rItem) return { tag: name, success: false, error: 'Queue item not found' };
        await prisma.queueItem.delete({ where: { id: rId } });
        return { tag: name, success: true, data: { id: rId, title: rItem.title, removed: true } };
      }

      case 'edit_queue_item': {
        const eId = params.id;
        if (!eId) return { tag: name, success: false, error: 'Missing queue item id' };
        const eItem = await prisma.queueItem.findFirst({ where: { id: eId, userId } });
        if (!eItem) return { tag: name, success: false, error: 'Queue item not found' };
        const editData: any = {};
        if (params.title !== undefined) editData.title = params.title;
        if (params.description !== undefined) editData.description = params.description;
        if (params.priority !== undefined) editData.priority = params.priority;
        const updated = await prisma.queueItem.update({ where: { id: eId }, data: editData });

        // Fire-and-forget: smart re-optimize the task description for the target agent type
        optimizeTaskForAgent(updated.id, userId).catch((err: any) => console.error('[smart-prompter] optimization failed:', err));

        return { tag: name, success: true, data: { id: updated.id, title: updated.title, description: updated.description, priority: updated.priority, optimizing: true } };
      }

      // ── Calendar & Reminders ─────────────────────────────────────────
      case 'create_event':
      case 'set_reminder': {
        // Store as queue items with metadata
        const itemType = name === 'create_event' ? 'task' : 'reminder';
        const eventMeta = JSON.stringify({
          date: params.date,
          time: params.time,
          type: name,
        });
        const eventDedup = await deduplicatedQueueCreate({
          type: itemType,
          title: params.title || (name === 'create_event' ? 'New Event' : 'Reminder'),
          description: params.description || null,
          priority: params.priority || 'medium',
          source: 'agent',
          userId,
          metadata: eventMeta,
        });
        return { tag: name, success: true, data: { id: eventDedup.item.id, title: eventDedup.item.title, deduplicated: !eventDedup.created } };
      }

      // ── Email ────────────────────────────────────────────────────────
      case 'send_email': {
        if (!params.to || !params.subject || !params.body) {
          return { tag: name, success: false, error: 'Missing to, subject, or body' };
        }
        const sendIdentity = params.identity || 'operator';
        // Try to find an email integration for this identity
        const emailAccount = await prisma.integrationAccount.findFirst({
          where: { userId, identity: sendIdentity, service: 'email', isActive: true },
        });
        if (emailAccount?.smtpHost && emailAccount?.smtpUser && emailAccount?.smtpPass) {
          // Send via SMTP
          try {
            const nodemailer = await import('nodemailer');
            const transporter = nodemailer.default.createTransport({
              host: emailAccount.smtpHost,
              port: emailAccount.smtpPort || 587,
              secure: emailAccount.smtpPort === 465,
              auth: { user: emailAccount.smtpUser, pass: emailAccount.smtpPass },
            });
            const fromAddr = emailAccount.emailAddress || emailAccount.smtpUser;
            const fromName = emailAccount.label || (sendIdentity === 'agent' ? 'Divi' : undefined);
            const result = await transporter.sendMail({
              from: fromName ? `"${fromName}" <${fromAddr}>` : fromAddr,
              to: params.to,
              subject: params.subject,
              text: params.body,
            });
            // Store sent email
            await prisma.emailMessage.create({
              data: {
                subject: params.subject,
                fromName: fromName || fromAddr,
                fromEmail: fromAddr,
                toEmail: params.to,
                body: params.body,
                snippet: params.body.slice(0, 200),
                source: 'sent',
                externalId: result.messageId || null,
                isRead: true,
                labels: 'sent',
                userId,
              },
            });
            // Log capability execution to activity feed
            await prisma.activityLog.create({
              data: {
                action: 'capability_executed',
                actor: 'divi',
                summary: `Sent email to ${params.to}: "${params.subject}"`,
                metadata: JSON.stringify({ capabilityType: 'email', action: 'send', to: params.to, subject: params.subject, identity: sendIdentity }),
                userId,
              },
            }).catch(() => {});
            return { tag: name, success: true, data: { messageId: result.messageId, sent: true, as: sendIdentity } };
          } catch (err: any) {
            return { tag: name, success: false, error: `SMTP send failed: ${err?.message}` };
          }
        } else {
          // Fallback: save as draft in queue (with dedup)
          const emailMeta = JSON.stringify({
            to: params.to,
            subject: params.subject,
            body: params.body,
            identity: sendIdentity,
            type: 'email_draft',
          });
          const emailDedup = await deduplicatedQueueCreate({
            type: 'task',
            title: `Email draft: ${params.subject || 'No subject'}`,
            description: `To: ${params.to}\n\n${params.body || ''}`,
            priority: 'medium',
            source: 'agent',
            userId,
            metadata: emailMeta,
          });
          return { tag: name, success: true, data: { id: emailDedup.item.id, note: `No email integration for ${sendIdentity}. Saved as draft in queue.`, deduplicated: !emailDedup.created } };
        }
      }

      // ── Memory (3-Tier System) ────────────────────────────────────────
      case 'update_memory': {
        if (!params.key || !params.value) {
          return { tag: name, success: false, error: 'Missing key or value' };
        }
        const tier = params.tier || 1;
        const memory = await prisma.memoryItem.upsert({
          where: {
            userId_key: { userId, key: params.key },
          },
          create: {
            tier,
            category: params.category || (tier === 1 ? 'general' : tier === 2 ? 'workflow' : 'preference'),
            key: params.key,
            value: params.value,
            scope: params.scope || null,
            pinned: params.pinned || false,
            priority: params.priority || null,
            confidence: tier === 3 ? (params.confidence ?? 0.5) : null,
            approved: tier === 3 ? null : undefined,
            source: 'agent',
            userId,
          },
          update: {
            value: params.value,
            category: params.category || undefined,
            scope: params.scope !== undefined ? params.scope : undefined,
            pinned: params.pinned !== undefined ? params.pinned : undefined,
            priority: params.priority !== undefined ? params.priority : undefined,
            confidence: params.confidence !== undefined ? params.confidence : undefined,
          },
        });
        return { tag: name, success: true, data: { id: memory.id, key: memory.key, tier } };
      }

      // ── Known Person (alias registration) ─────────────────────────────
      case 'add_known_person': {
        if (!params.alias || !params.fullName) {
          return { tag: name, success: false, error: 'Missing alias or fullName' };
        }
        // Save as a Tier 1 memory fact for name resolution
        const memory = await prisma.memoryItem.upsert({
          where: { userId_key: { userId, key: `known_person_${params.alias.toLowerCase()}` } },
          create: {
            tier: 1,
            category: 'contact',
            key: `known_person_${params.alias.toLowerCase()}`,
            value: `${params.alias} → ${params.fullName}${params.context ? ` (${params.context})` : ''}`,
            source: 'agent',
            userId,
          },
          update: {
            value: `${params.alias} → ${params.fullName}${params.context ? ` (${params.context})` : ''}`,
          },
        });
        return { tag: name, success: true, data: { id: memory.id, alias: params.alias, fullName: params.fullName } };
      }

      // ── Learning (saved as Tier 3 pattern) ────────────────────────────
      case 'save_learning': {
        if (!params.observation) {
          return { tag: name, success: false, error: 'Missing observation' };
        }
        // Save as both UserLearning (legacy) and Tier 3 memory
        const learning = await prisma.userLearning.create({
          data: {
            category: params.category || 'preference',
            observation: params.observation,
            confidence: typeof params.confidence === 'number' ? params.confidence : 0.5,
            userId,
          },
        });
        // Also create a Tier 3 memory item
        const patternKey = `learning_${Date.now()}`;
        await prisma.memoryItem.create({
          data: {
            tier: 3,
            category: params.category || 'preference',
            key: patternKey,
            value: params.observation,
            confidence: typeof params.confidence === 'number' ? params.confidence : 0.5,
            approved: null,
            source: 'agent',
            userId,
          },
        });
        return { tag: name, success: true, data: { id: learning.id } };
      }

      // ── Platform Setup: Webhook ──────────────────────────────────────
      case 'setup_webhook': {
        if (!params.name || !params.type) {
          return { tag: name, success: false, error: 'Missing name or type' };
        }
        const validTypes = ['calendar', 'email', 'transcript', 'generic'];
        const whType = validTypes.includes(params.type) ? params.type : 'generic';
        // Generate a cryptographic secret
        const crypto = await import('crypto');
        const whSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
        const webhook = await prisma.webhook.create({
          data: {
            name: params.name,
            type: whType,
            secret: whSecret,
            url: `/api/webhooks/${whType}`,
            isActive: true,
            userId,
          },
        });
        // Log activity
        await prisma.activityLog.create({
          data: {
            action: 'webhook_created',
            actor: 'divi',
            summary: `Divi created webhook "${params.name}" (${whType})`,
            metadata: JSON.stringify({ webhookId: webhook.id, type: whType }),
            userId,
          },
        }).catch(() => {});
        return {
          tag: name,
          success: true,
          data: {
            id: webhook.id,
            name: webhook.name,
            type: whType,
            secret: whSecret,
            url: webhook.url,
            note: `Webhook created. External services should POST to {your_domain}${webhook.url} with header X-Webhook-Secret: ${whSecret}`,
          },
        };
      }

      // ── Platform Setup: API Key ──────────────────────────────────────
      case 'save_api_key': {
        if (!params.provider || !params.apiKey) {
          return { tag: name, success: false, error: 'Missing provider or apiKey' };
        }
        const validProviders = ['openai', 'anthropic'];
        const keyProvider = validProviders.includes(params.provider.toLowerCase())
          ? params.provider.toLowerCase()
          : null;
        if (!keyProvider) {
          return { tag: name, success: false, error: `Invalid provider. Use: ${validProviders.join(', ')}` };
        }
        // Deactivate existing keys for this provider for this user, then create new
        await prisma.agentApiKey.updateMany({
          where: { provider: keyProvider, userId },
          data: { isActive: false },
        });
        const apiKeyRecord = await prisma.agentApiKey.create({
          data: {
            provider: keyProvider,
            apiKey: params.apiKey,
            label: params.label || `${keyProvider} key`,
            isActive: true,
            user: { connect: { id: userId } },
          },
        });
        // Log activity
        await prisma.activityLog.create({
          data: {
            action: 'api_key_saved',
            actor: 'divi',
            summary: `Divi saved ${keyProvider} API key`,
            metadata: JSON.stringify({ provider: keyProvider }),
            userId,
          },
        }).catch(() => {});
        return {
          tag: name,
          success: true,
          data: {
            id: apiKeyRecord.id,
            provider: keyProvider,
            note: `${keyProvider} API key saved and activated. You can now use ${keyProvider === 'openai' ? 'GPT-4o' : 'Claude'} through me.`,
          },
        };
      }

      // ── Platform Setup: Calendar Event ───────────────────────────────
      case 'create_calendar_event': {
        if (!params.title) {
          return { tag: name, success: false, error: 'Missing title' };
        }
        const startTime = params.startTime || params.date
          ? new Date(params.startTime || `${params.date}T${params.time || '09:00'}`)
          : new Date();
        const endTime = params.endTime
          ? new Date(params.endTime)
          : new Date(startTime.getTime() + 60 * 60 * 1000); // default 1hr

        const calEvent = await prisma.calendarEvent.create({
          data: {
            title: params.title,
            description: params.description || null,
            startTime,
            endTime,
            location: params.location || null,
            attendees: params.attendees ? JSON.stringify(params.attendees) : null,
            source: 'chat',
            userId,
          },
        });
        // Log capability execution to activity feed
        await prisma.activityLog.create({
          data: {
            action: 'capability_executed',
            actor: 'divi',
            summary: `Created calendar event: "${params.title}" at ${startTime.toISOString()}`,
            metadata: JSON.stringify({ capabilityType: 'meetings', action: 'create_event', title: params.title }),
            userId,
          },
        }).catch(() => {});
        return {
          tag: name,
          success: true,
          data: { id: calEvent.id, title: calEvent.title, startTime: calEvent.startTime.toISOString() },
        };
      }

      // ── Platform Setup: Document ─────────────────────────────────────
      case 'create_document': {
        if (!params.title) {
          return { tag: name, success: false, error: 'Missing title' };
        }
        const validDocTypes = ['note', 'report', 'template', 'meeting_notes'];
        const docType = validDocTypes.includes(params.type) ? params.type : 'note';
        const doc = await prisma.document.create({
          data: {
            title: params.title,
            content: params.content || '',
            type: docType,
            tags: params.tags || null,
            userId,
          },
        });
        return {
          tag: name,
          success: true,
          data: { id: doc.id, title: doc.title, type: docType },
        };
      }

      // ── Platform Setup: Comms Message ────────────────────────────────
      case 'send_comms': {
        if (!params.content) {
          return { tag: name, success: false, error: 'Missing content' };
        }
        const comms = await prisma.commsMessage.create({
          data: {
            sender: 'divi',
            content: params.content,
            state: 'new',
            priority: params.priority || 'normal',
            linkedCardId: params.linkedCardId || null,
            linkedContactId: params.linkedContactId || null,
            userId,
          },
        });
        return {
          tag: name,
          success: true,
          data: { id: comms.id, note: 'Message sent to Comms Channel' },
        };
      }

      case 'add_relationship': {
        // params: { fromName OR fromId, toName OR toId, type, label? }
        const relType = params.type || 'colleague';
        const validTypes = ['colleague', 'manager', 'report', 'partner', 'spouse', 'friend', 'referral', 'custom'];
        if (!validTypes.includes(relType)) {
          return { tag: name, success: false, error: `Invalid type: ${relType}. Must be one of: ${validTypes.join(', ')}` };
        }

        // Resolve contacts by name or id
        let fromId = params.fromId;
        let toId = params.toId;

        if (!fromId && params.fromName) {
          const c = await prisma.contact.findFirst({
            where: { name: { contains: params.fromName, mode: 'insensitive' }, userId },
          });
          if (c) fromId = c.id;
        }
        if (!toId && params.toName) {
          const c = await prisma.contact.findFirst({
            where: { name: { contains: params.toName, mode: 'insensitive' }, userId },
          });
          if (c) toId = c.id;
        }

        if (!fromId || !toId) {
          return { tag: name, success: false, error: 'Could not resolve both contacts. Provide fromId/toId or fromName/toName.' };
        }
        if (fromId === toId) {
          return { tag: name, success: false, error: 'Cannot create a relationship between a contact and itself.' };
        }

        const rel = await prisma.contactRelationship.upsert({
          where: { fromId_toId: { fromId, toId } },
          update: { type: relType, label: params.label || null },
          create: { fromId, toId, type: relType, label: params.label || null },
        });

        return {
          tag: name,
          success: true,
          data: { id: rel.id, fromId, toId, type: relType, note: 'Relationship created/updated' },
        };
      }

      case 'update_contact': {
        // params: { contactId OR name, ...fields to update }
        let contactId = params.contactId;
        if (!contactId && params.name) {
          const c = await prisma.contact.findFirst({
            where: { name: { contains: params.name, mode: 'insensitive' }, userId },
          });
          if (c) contactId = c.id;
        }
        if (!contactId) {
          return { tag: name, success: false, error: 'Could not find contact. Provide contactId or name.' };
        }

        const updateData: Record<string, any> = {};
        if (params.email !== undefined) updateData.email = params.email;
        if (params.phone !== undefined) updateData.phone = params.phone;
        if (params.company !== undefined) updateData.company = params.company;
        if (params.role !== undefined) updateData.role = params.role;
        if (params.notes !== undefined) updateData.notes = params.notes;
        if (params.tags !== undefined) updateData.tags = params.tags;
        if (params.enrichedData !== undefined) {
          // Merge with existing enrichedData
          const existing = await prisma.contact.findUnique({ where: { id: contactId }, select: { enrichedData: true } });
          const prev = (existing?.enrichedData as unknown as Record<string, any>) || {};
          updateData.enrichedData = { ...prev, ...(typeof params.enrichedData === 'object' ? params.enrichedData : {}) };
        }

        if (Object.keys(updateData).length === 0) {
          return { tag: name, success: false, error: 'No fields to update.' };
        }

        const updated = await prisma.contact.update({
          where: { id: contactId },
          data: updateData,
        });
        return {
          tag: name,
          success: true,
          data: { id: updated.id, name: updated.name, fieldsUpdated: Object.keys(updateData) },
        };
      }

      case 'link_recording': {
        // params: { recordingId, cardId }
        if (!params.recordingId || !params.cardId) {
          return { tag: name, success: false, error: 'Both recordingId and cardId are required.' };
        }
        const recording = await prisma.recording.update({
          where: { id: params.recordingId },
          data: { cardId: params.cardId },
        });
        return {
          tag: name,
          success: true,
          data: { id: recording.id, cardId: params.cardId, note: 'Recording linked to card' },
        };
      }

      // ── Connection & Relay Actions ──────────────────────────────────────

      case 'relay_request': {
        // params: { connectionNickname or connectionId, intent, subject, payload?, priority? }
        const subject = params.subject || params.message || 'Agent relay request';
        const intent = params.intent || 'custom';
        const priority = params.priority || 'normal';

        // Find the connection — by nickname, username, email, or ID
        let connection: any = null;
        if (params.connectionId) {
          connection = await prisma.connection.findUnique({ where: { id: params.connectionId } });
        } else if (params.connectionNickname || params.to || params.name || params.username || params.handle) {
          // Normalize search — strip leading @ if present
          let search = (params.connectionNickname || params.to || params.name || params.username || params.handle || '').toString().toLowerCase().trim();
          if (search.startsWith('@')) search = search.slice(1);
          const allConns = await prisma.connection.findMany({
            where: {
              OR: [{ requesterId: userId }, { accepterId: userId }],
              status: 'active',
            },
            include: {
              requester: { select: { id: true, name: true, email: true, username: true } },
              accepter: { select: { id: true, name: true, email: true, username: true } },
            },
          });
          // Prefer EXACT username match first (most specific), then substring match on other fields
          connection = allConns.find((c: any) => {
            const peer = c.requesterId === userId ? c.accepter : c.requester;
            const peerUsername = (peer?.username || '').toLowerCase();
            return peerUsername && peerUsername === search;
          });
          if (!connection) {
            connection = allConns.find((c: any) => {
              const peer = c.requesterId === userId ? c.accepter : c.requester;
              const nick = (c.nickname || '').toLowerCase();
              const peerNick = (c.peerNickname || '').toLowerCase();
              const peerName = (c.peerUserName || '').toLowerCase();
              const peerUsername = (peer?.username || '').toLowerCase();
              const reqName = (c.requester?.name || '').toLowerCase();
              const accName = (c.accepter?.name || '').toLowerCase();
              const reqEmail = (c.requester?.email || '').toLowerCase();
              const accEmail = (c.accepter?.email || '').toLowerCase();
              return [nick, peerNick, peerName, peerUsername, reqName, accName, reqEmail, accEmail].some(v => v && v.includes(search));
            });
          }
        }

        if (!connection) {
          return { tag: name, success: false, error: 'Could not find an active connection matching that name. The user may need to connect first.' };
        }

        const toUserId_relay = connection.requesterId === userId ? connection.accepterId : connection.requesterId;

        // Threading: inherit threadId if continuing a thread, or generate new
        let relayThreadId = params.threadId || null;
        if (!relayThreadId && params.parentRelayId) {
          const parentRelay = await prisma.agentRelay.findUnique({ where: { id: params.parentRelayId }, select: { threadId: true } });
          relayThreadId = parentRelay?.threadId || null;
        }

        const relay = await prisma.agentRelay.create({
          data: {
            connectionId: connection.id,
            fromUserId: userId,
            toUserId: connection.isFederated ? null : toUserId_relay,
            direction: 'outbound',
            type: 'request',
            intent,
            subject,
            payload: params.payload ? (typeof params.payload === 'string' ? params.payload : JSON.stringify(params.payload)) : null,
            status: 'pending',
            priority,
            threadId: relayThreadId,
            parentRelayId: params.parentRelayId || null,
            peerInstanceUrl: connection.isFederated ? connection.peerInstanceUrl : null,
            cardId: params.cardId || null, // v2: Direct FK to source card if provided
          },
        });

        // Notify the receiver (local)
        if (!connection.isFederated && toUserId_relay) {
          await prisma.commsMessage.create({
            data: {
              sender: 'divi',
              content: `📡 Relay sent on your behalf: "${subject}"`,
              state: 'new',
              priority,
              userId: toUserId_relay,
              metadata: JSON.stringify({ type: 'agent_relay', relayId: relay.id, intent }),
            },
          });
          await prisma.agentRelay.update({ where: { id: relay.id }, data: { status: 'delivered' } });
        }

        await prisma.activityLog.create({
          data: {
            action: 'relay_sent',
            actor: 'divi',
            summary: `Divi sent ${intent} relay: "${subject}"`,
            metadata: JSON.stringify({ relayId: relay.id, connectionId: connection.id }),
            userId,
          },
        });

        // Push relay state webhook
        pushRelayStateChanged(userId, { relayId: relay.id, threadId: relayThreadId, previousState: null, newState: 'pending', subject });

        return { tag: name, success: true, data: { relayId: relay.id, threadId: relayThreadId, subject, intent, status: 'delivered' } };
      }

      case 'relay_broadcast': {
        // params: { subject, payload?, intent?, priority?, context?, teamId?, projectId? }
        // Sends a relay to connections — scoped to team/project members when provided, otherwise all connections
        const broadcastSubject = params.subject || params.message || 'Team-wide query';
        const broadcastIntent = params.intent || 'ask';
        const broadcastPriority = params.priority || 'normal';

        // Build scoped connection ID set when team/project is specified
        let scopedConnIds: Set<string> | null = null;
        if (params.projectId) {
          const projMembers = await prisma.projectMember.findMany({
            where: { projectId: params.projectId },
            select: { connectionId: true },
          });
          scopedConnIds = new Set(projMembers.map((m: any) => m.connectionId).filter(Boolean) as string[]);
        } else if (params.teamId) {
          const tmMembers = await prisma.teamMember.findMany({
            where: { teamId: params.teamId },
            select: { connectionId: true },
          });
          scopedConnIds = new Set(tmMembers.map((m: any) => m.connectionId).filter(Boolean) as string[]);
        }

        const allActiveConns = await prisma.connection.findMany({
          where: {
            OR: [{ requesterId: userId }, { accepterId: userId }],
            status: 'active',
            ...(scopedConnIds ? { id: { in: Array.from(scopedConnIds) } } : {}),
          },
          include: {
            requester: { select: { id: true, name: true, email: true } },
            accepter: { select: { id: true, name: true, email: true } },
          },
        });

        if (allActiveConns.length === 0) {
          return { tag: name, success: false, error: 'No active connections to broadcast to.' };
        }

        // Check recipient relay preferences — respect broadcast opt-outs
        const peerUserIds = allActiveConns.map((c: any) => c.requesterId === userId ? c.accepterId : c.requesterId).filter(Boolean) as string[];
        const peerProfiles = await prisma.userProfile.findMany({
          where: { userId: { in: peerUserIds } },
          select: { userId: true, relayMode: true, allowBroadcasts: true },
        });
        const profileMap = new Map<string, any>(peerProfiles.map((p: any) => [p.userId, p]));

        const broadcastResults: { name: string; relayId: string }[] = [];
        const skipped: string[] = [];
        for (const conn of allActiveConns) {
          const toId = conn.requesterId === userId ? conn.accepterId : conn.requesterId;

          // Check if recipient opted out of broadcasts
          if (toId) {
            const peerPref = profileMap.get(toId);
            if (peerPref) {
              if (peerPref.relayMode === 'off' || peerPref.relayMode === 'minimal' || !peerPref.allowBroadcasts) {
                const peerName = conn.requesterId === userId
                  ? (conn.accepter?.name || 'Unknown')
                  : (conn.requester?.name || 'Unknown');
                skipped.push(peerName);
                continue;
              }
            }
          }
          const peerName = conn.requesterId === userId
            ? (conn.accepter?.name || conn.nickname || 'Unknown')
            : (conn.requester?.name || conn.peerNickname || 'Unknown');

          const relay = await prisma.agentRelay.create({
            data: {
              connectionId: conn.id,
              fromUserId: userId,
              toUserId: conn.isFederated ? null : toId,
              direction: 'outbound',
              type: 'request',
              intent: broadcastIntent,
              subject: broadcastSubject,
              payload: JSON.stringify({
                ...(params.payload ? (typeof params.payload === 'object' ? params.payload : { data: params.payload }) : {}),
                _broadcast: true,
                _context: params.context || null,
              }),
              status: 'pending',
              priority: broadcastPriority,
              peerInstanceUrl: conn.isFederated ? conn.peerInstanceUrl : null,
              ...(params.teamId ? { teamId: params.teamId } : {}),
              ...(params.projectId ? { projectId: params.projectId } : {}),
            },
          });

          // Deliver: local users get comms, federated connections get pushed
          if (conn.isFederated) {
            // Push to federated instance
            try {
              const { pushRelayToFederatedInstance } = await import('./federation-push');
              const senderUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
              pushRelayToFederatedInstance(conn.id, {
                relayId: relay.id,
                fromUserEmail: senderUser?.email || '',
                fromUserName: senderUser?.name || '',
                fromUserId: userId,
                toUserEmail: conn.peerUserEmail || undefined,
                type: 'request',
                intent: broadcastIntent,
                subject: broadcastSubject,
                payload: {
                  ...(params.payload ? (typeof params.payload === 'object' ? params.payload : { data: params.payload }) : {}),
                  _broadcast: true,
                  _context: params.context || null,
                },
                priority: broadcastPriority,
              });
            } catch (fedErr: any) {
              console.warn('[relay_broadcast] Failed to push federated relay:', fedErr?.message);
            }
          } else if (toId) {
            await prisma.commsMessage.create({
              data: {
                sender: 'divi',
                content: `📡 Team relay: "${broadcastSubject}"`,
                state: 'new',
                priority: broadcastPriority,
                userId: toId,
                metadata: JSON.stringify({ type: 'agent_relay', relayId: relay.id, intent: broadcastIntent, broadcast: true }),
              },
            });
            await prisma.agentRelay.update({ where: { id: relay.id }, data: { status: 'delivered' } });
          }

          broadcastResults.push({ name: peerName, relayId: relay.id });
        }

        await prisma.activityLog.create({
          data: {
            action: 'relay_broadcast',
            actor: 'divi',
            summary: `Divi broadcast "${broadcastSubject}" to ${broadcastResults.length} connections`,
            metadata: JSON.stringify({ relayIds: broadcastResults.map(r => r.relayId) }),
            userId,
          },
        }).catch(() => {});

        return {
          tag: name,
          success: true,
          data: {
            sent: broadcastResults.length,
            recipients: broadcastResults.map(r => r.name),
            subject: broadcastSubject,
          },
        };
      }

      case 'relay_ambient': {
        // params: { to (name/email), message|question|subject, intent?, context?, topic? }
        // Creates a LOW-PRIORITY relay that the receiving agent should weave naturally into conversation
        // rather than interrupting with a notification. Accepts ANY message type — updates, questions, intros,
        // schedules, opinions, observations — not just questions.
        const ambientMessage = params.message || params.subject || params.question || params.text || '';
        if (!ambientMessage) {
          return { tag: name, success: false, error: 'Missing message for ambient relay' };
        }

        const searchTerm = (params.to || params.name || params.connectionNickname || '').toLowerCase();
        if (!searchTerm) {
          return { tag: name, success: false, error: 'Must specify who to send to (to/name)' };
        }

        // Intent defaults to 'custom' — ambient can convey any of: ask, share_update, intro, schedule, opinion, note, custom
        const ambientIntent = (params.intent || 'custom').toString();

        const ambientConns = await prisma.connection.findMany({
          where: {
            OR: [{ requesterId: userId }, { accepterId: userId }],
            status: 'active',
          },
          include: {
            requester: { select: { id: true, name: true, email: true } },
            accepter: { select: { id: true, name: true, email: true } },
          },
        });

        const ambientConn = ambientConns.find((c: any) => {
          const nick = (c.nickname || '').toLowerCase();
          const peerNick = (c.peerNickname || '').toLowerCase();
          const peerName = (c.peerUserName || '').toLowerCase();
          const reqName = (c.requester?.name || '').toLowerCase();
          const accName = (c.accepter?.name || '').toLowerCase();
          const reqEmail = (c.requester?.email || '').toLowerCase();
          const accEmail = (c.accepter?.email || '').toLowerCase();
          return [nick, peerNick, peerName, reqName, accName, reqEmail, accEmail].some(v => v.includes(searchTerm));
        });

        if (!ambientConn) {
          return { tag: name, success: false, error: `No active connection matching "${searchTerm}"` };
        }

        const ambientToId = ambientConn.requesterId === userId ? ambientConn.accepterId : ambientConn.requesterId;

        // Check recipient's ambient relay preferences
        if (ambientToId) {
          const recipientProfile = await prisma.userProfile.findUnique({
            where: { userId: ambientToId },
            select: { relayMode: true, allowAmbientInbound: true, relayTopicFilters: true },
          });
          if (recipientProfile) {
            if (recipientProfile.relayMode === 'off' || recipientProfile.relayMode === 'minimal') {
              return { tag: name, success: false, error: `Recipient has relay mode set to "${recipientProfile.relayMode}" — ambient relays not accepted.` };
            }
            if (!recipientProfile.allowAmbientInbound) {
              return { tag: name, success: false, error: 'Recipient has opted out of receiving ambient relays.' };
            }
            // Check topic filters
            if (params.topic && recipientProfile.relayTopicFilters) {
              try {
                const filters: string[] = JSON.parse(recipientProfile.relayTopicFilters);
                if (filters.some(f => params.topic.toLowerCase().includes(f.toLowerCase()))) {
                  return { tag: name, success: false, error: `Recipient has opted out of "${params.topic}" topic relays.` };
                }
              } catch {}
            }
          }
        }

        const ambientRelay = await prisma.agentRelay.create({
          data: {
            connectionId: ambientConn.id,
            fromUserId: userId,
            toUserId: ambientConn.isFederated ? null : ambientToId,
            direction: 'outbound',
            type: 'request',
            intent: ambientIntent,
            subject: ambientMessage,
            payload: JSON.stringify({
              _ambient: true,
              _context: params.context || null,
              _topic: params.topic || null,
              _instruction: 'This is an ambient relay. Do NOT interrupt the user. Instead, naturally weave this message into your next conversation when contextually relevant. Respond if/when you have a natural answer.',
            }),
            status: 'pending',
            priority: 'low',
            peerInstanceUrl: ambientConn.isFederated ? ambientConn.peerInstanceUrl : null,
            ...(params.teamId ? { teamId: params.teamId } : {}),
            ...(params.projectId ? { projectId: params.projectId } : {}),
          },
        });

        // Deliver: local users get silent delivery, federated connections get pushed
        if (ambientConn.isFederated) {
          try {
            const { pushRelayToFederatedInstance } = await import('./federation-push');
            const senderUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
            pushRelayToFederatedInstance(ambientConn.id, {
              relayId: ambientRelay.id,
              fromUserEmail: senderUser?.email || '',
              fromUserName: senderUser?.name || '',
              fromUserId: userId,
              toUserEmail: ambientConn.peerUserEmail || undefined,
              type: 'request',
              intent: ambientIntent,
              subject: ambientMessage,
              payload: {
                _ambient: true,
                _context: params.context || null,
                _topic: params.topic || null,
                _instruction: 'This is an ambient relay. Do NOT interrupt the user. Weave naturally into conversation.',
              },
              priority: 'low',
            });
          } catch (fedErr: any) {
            console.warn('[relay_ambient] Failed to push federated ambient relay:', fedErr?.message);
          }
        } else if (ambientToId) {
          await prisma.agentRelay.update({ where: { id: ambientRelay.id }, data: { status: 'delivered' } });
          // No comms notification for ambient relays — the receiving agent picks it up silently
        }

        await prisma.activityLog.create({
          data: {
            action: 'relay_ambient',
            actor: 'divi',
            summary: `Divi sent ambient ${ambientIntent} to ${searchTerm}: "${ambientMessage.slice(0, 60)}..."`,
            metadata: JSON.stringify({ relayId: ambientRelay.id, intent: ambientIntent }),
            userId,
          },
        }).catch(() => {});

        return {
          tag: name,
          success: true,
          data: {
            relayId: ambientRelay.id,
            to: searchTerm,
            subject: ambientMessage,
            message: ambientMessage,
            intent: ambientIntent,
            mode: 'ambient',
            note: `Sent as ambient ${ambientIntent} relay — their agent will work this into conversation naturally.`,
          },
        };
      }

      case 'accept_connection': {
        // params: { connectionId }
        if (!params.connectionId) {
          return { tag: name, success: false, error: 'connectionId is required.' };
        }
        const conn = await prisma.connection.findUnique({ where: { id: params.connectionId } });
        if (!conn || conn.accepterId !== userId || conn.status !== 'pending') {
          return { tag: name, success: false, error: 'No pending connection found for you with that ID.' };
        }
        const acceptedConn = await prisma.connection.update({
          where: { id: params.connectionId },
          data: { status: 'active' },
        });
        await prisma.commsMessage.create({
          data: {
            sender: 'divi',
            content: `Connection accepted! Agents can now communicate.`,
            state: 'new',
            priority: 'normal',
            userId: conn.requesterId,
            metadata: JSON.stringify({ type: 'connection_accepted', connectionId: params.connectionId }),
          },
        });
        return { tag: name, success: true, data: { connectionId: acceptedConn.id, status: 'active' } };
      }

      case 'relay_respond': {
        // params: { relayId, status ("completed"|"declined"), responsePayload?,
        //           _ambientQuality?, _ambientDisruption?, _ambientTopicRelevance?, _conversationTopic?, _questionPhrasing? }
        // Flexible: also accept { to, message } or { response } as fallback formats
        const resolvedPayload = params.responsePayload || params.message || params.response || params.text || null;
        const resolvedStatus = params.status || 'completed'; // default to completed

        // If relayId is missing, auto-resolve: find the oldest unresolved inbound relay for this user
        let resolvedRelayId = params.relayId;
        if (!resolvedRelayId) {
          const autoRelay = await prisma.agentRelay.findFirst({
            where: { toUserId: userId, status: { in: ['delivered', 'user_review'] } },
            orderBy: { createdAt: 'asc' }, // FIFO
          });
          if (autoRelay) {
            resolvedRelayId = autoRelay.id;
            console.log(`[relay_respond] Auto-resolved relayId: ${resolvedRelayId} (LLM omitted relayId)`);
          } else {
            return { tag: name, success: false, error: 'No unresolved inbound relay found to respond to.' };
          }
        }

        const relayToRespond = await prisma.agentRelay.findUnique({ where: { id: resolvedRelayId } });
        if (!relayToRespond) {
          return { tag: name, success: false, error: 'Relay not found.' };
        }
        const updatedRelay = await prisma.agentRelay.update({
          where: { id: resolvedRelayId },
          data: {
            status: resolvedStatus,
            resolvedAt: new Date(),
            responsePayload: resolvedPayload ? (typeof resolvedPayload === 'string' ? resolvedPayload : JSON.stringify(resolvedPayload)) : null,
          },
        });

        // ── Ambient Learning: Capture signal if this was an ambient relay ──
        let isAmbient = false;
        let ambientTopic: string | null = null;
        try {
          const payload = JSON.parse(relayToRespond.payload || '{}');
          isAmbient = !!payload._ambient;
          ambientTopic = payload._topic || null;
        } catch {}

        if (isAmbient) {
          try {
            const { captureAmbientSignal } = await import('./ambient-learning');
            await captureAmbientSignal({
              relayId: resolvedRelayId,
              fromUserId: relayToRespond.fromUserId,
              toUserId: userId,
              relayCreatedAt: relayToRespond.createdAt,
              outcome: resolvedStatus === 'completed' ? 'answered' : 'declined',
              responseQuality: params._ambientQuality || (
                resolvedPayload && (typeof resolvedPayload === 'string' ? resolvedPayload : JSON.stringify(resolvedPayload)).length > 50
                  ? 'substantive' : resolvedPayload ? 'brief' : null
              ),
              disruptionLevel: params._ambientDisruption || null,
              topicRelevance: params._ambientTopicRelevance || null,
              ambientTopic,
              conversationTopic: params._conversationTopic || null,
              questionPhrasing: params._questionPhrasing || null,
            });
          } catch (err: any) {
            console.error('[ambient-learning] Failed to capture signal:', err.message);
          }
        }

        // Notify the original sender
        if (relayToRespond.fromUserId !== userId) {
          const statusLabel = resolvedStatus === 'completed' ? '✅ completed' : '❌ declined';
          await prisma.commsMessage.create({
            data: {
              sender: 'divi',
              content: `📡 Divi ${statusLabel} the relay: "${relayToRespond.subject}"`,
              state: 'new',
              priority: relayToRespond.priority || 'normal',
              userId: relayToRespond.fromUserId,
              metadata: JSON.stringify({ type: 'relay_response', relayId: resolvedRelayId }),
            },
          });
        }
        // Push relay state webhook
        pushRelayStateChanged(relayToRespond.fromUserId, {
          relayId: resolvedRelayId,
          threadId: relayToRespond.threadId,
          previousState: relayToRespond.status,
          newState: resolvedStatus,
          subject: relayToRespond.subject,
        });

        // ── Sync delegation status on sender's checklist item ──
        // Find any checklist item linked to this relay (sourceType='relay', sourceId=relayId)
        try {
          const linkedChecklist = await prisma.checklistItem.findFirst({
            where: { sourceType: 'relay', sourceId: resolvedRelayId },
          });
          if (linkedChecklist) {
            const newDelegationStatus = resolvedStatus === 'completed' ? 'accepted' : resolvedStatus === 'declined' ? 'declined' : resolvedStatus;
            await prisma.checklistItem.update({
              where: { id: linkedChecklist.id },
              data: {
                delegationStatus: newDelegationStatus,
                completed: resolvedStatus === 'completed' ? false : linkedChecklist.completed, // accepted != completed
              },
            });
          }
        } catch {}

        // ── Sync linked queue item if relay_respond completes the relay ──
        if (relayToRespond.queueItemId && (resolvedStatus === 'completed' || resolvedStatus === 'declined')) {
          try {
            const { syncQueueWithRelayCompletion } = await import('./relay-queue-bridge');
            await syncQueueWithRelayCompletion(resolvedRelayId, relayToRespond.fromUserId, resolvedPayload || resolvedStatus);
          } catch {}
        }

        // ── Push completion ack back to originating federated instance ──
        if (relayToRespond.peerRelayId && relayToRespond.peerInstanceUrl) {
          try {
            const { pushRelayAckToFederatedInstance } = await import('./federation-push');
            pushRelayAckToFederatedInstance({
              id: relayToRespond.id,
              peerRelayId: relayToRespond.peerRelayId,
              peerInstanceUrl: relayToRespond.peerInstanceUrl,
              connectionId: relayToRespond.connectionId,
              subject: relayToRespond.subject,
              status: resolvedStatus,
              responsePayload: resolvedPayload ? (typeof resolvedPayload === 'string' ? resolvedPayload : JSON.stringify(resolvedPayload)) : null,
            }).catch(() => {});
          } catch {}
        }

        // Build the display string for the outgoing response card:
        // - If declined with no payload: show "Declined: <original subject>"
        // - Otherwise: show the operator's actual response payload (what they sent back)
        // - Fallback to original subject only if we truly have nothing else
        const responseText: string = (() => {
          if (typeof resolvedPayload === 'string' && resolvedPayload.trim()) return resolvedPayload.trim();
          if (resolvedPayload && typeof resolvedPayload === 'object') {
            try {
              const s = JSON.stringify(resolvedPayload);
              return s.length > 200 ? s.slice(0, 200) + '…' : s;
            } catch { /* noop */ }
          }
          if (resolvedStatus === 'declined') return `Declined: ${relayToRespond.subject}`;
          if (resolvedStatus === 'completed') return `Acknowledged: ${relayToRespond.subject}`;
          return relayToRespond.subject;
        })();

        return {
          tag: name,
          success: true,
          data: {
            relayId: updatedRelay.id,
            status: resolvedStatus,
            // `subject` is what the outgoing-response card renders — this must be
            // the operator's response, NOT the original inbound subject.
            subject: responseText,
            originalSubject: relayToRespond.subject,
            responsePayload: resolvedPayload || null,
            ambientSignalCaptured: isAmbient,
          },
        };
      }

      case 'update_profile': {
        // params can include any profile field: skills, languages, countriesLived, etc.
        // Merge arrays rather than replace — add new items to existing lists
        const profile = await prisma.userProfile.findUnique({ where: { userId } });
        const parse = (v: string | null, fb: any = []) => { if (!v) return fb; try { return JSON.parse(v); } catch { return fb; } };

        // Map client field names to DB field names
        const fieldRemap: Record<string, string> = { capacityStatus: 'capacity', lifeMilestones: 'lifeExperiences' };
        const jsonFields = ['skills', 'experience', 'education', 'languages', 'countriesLived', 'lifeExperiences', 'volunteering', 'hobbies', 'personalValues', 'superpowers', 'taskTypes', 'outOfOffice'];
        const plainDbFields = ['headline', 'bio', 'linkedinUrl', 'capacity', 'capacityNote', 'timezone', 'workingHours', 'currentTitle', 'currentCompany', 'industry'];

        const data: Record<string, any> = {};

        // Handle plain fields (map client names to DB names)
        for (const [clientName, dbName] of Object.entries(fieldRemap)) {
          if (params[clientName] !== undefined) data[dbName] = params[clientName];
        }
        for (const f of plainDbFields) {
          if (params[f] !== undefined) data[f] = params[f];
        }

        // Handle JSON array fields
        for (const f of jsonFields) {
          const clientField = f === 'lifeExperiences' ? 'lifeMilestones' : f;
          const val = params[f] ?? params[clientField];
          if (val !== undefined) {
            const newItems = Array.isArray(val) ? val : [val];
            if (profile) {
              const existing = parse((profile as any)[f]);
              if (typeof newItems[0] === 'string') {
                const merged = [...new Set([...existing, ...newItems])];
                data[f] = JSON.stringify(merged);
              } else {
                data[f] = JSON.stringify([...existing, ...newItems]);
              }
            } else {
              data[f] = JSON.stringify(newItems);
            }
          }
        }

        if (Object.keys(data).length === 0) {
          return { tag: name, success: false, error: 'No profile fields to update.' };
        }

        await prisma.userProfile.upsert({
          where: { userId },
          update: data,
          create: {
            user: { connect: { id: userId } },
            capacity: 'available',
            visibility: 'connections',
            sharedSections: JSON.stringify(['professional', 'lived_experience', 'availability', 'values', 'superpowers']),
            ...data,
          },
        });

        return { tag: name, success: true, data: { fieldsUpdated: Object.keys(data) } };
      }

      // ── Orchestration: Task Route ──────────────────────────────────────────
      case 'task_route': {
        const { assembleCardContext, findSkillMatches, generateBriefMarkdown, storeBrief } = await import('./brief-assembly');

        const { cardId: rawCardId, cardTitle, tasks, routeType: preferredRoute, teamId: routeTeamId, projectId: routeProjectId } = params;
        if (!tasks || !Array.isArray(tasks)) {
          return { tag: name, success: false, error: 'task_route requires tasks array' };
        }

        // Resolve cardId — explicit, by title lookup, or null (standalone routing)
        let resolvedCardId = rawCardId || null;
        if (!resolvedCardId && cardTitle) {
          const card = await prisma.kanbanCard.findFirst({
            where: { userId, title: { contains: cardTitle, mode: 'insensitive' } },
            orderBy: { updatedAt: 'desc' },
            select: { id: true },
          });
          if (card) resolvedCardId = card.id;
        }

        // Assemble card context if we have a card — otherwise proceed without it
        let context: Awaited<ReturnType<typeof assembleCardContext>> | null = null;
        if (resolvedCardId) {
          context = await assembleCardContext(resolvedCardId, userId);
        }

        const results: any[] = [];

        for (const task of tasks) {
          const { title, description, requiredSkills = [], requiredTaskTypes = [], intent = 'assign_task', priority = 'normal', to, route } = task;

          // Find skill matches — scope to team/project when provided
          const matches = await findSkillMatches(userId, requiredSkills, requiredTaskTypes, { teamId: routeTeamId, projectId: routeProjectId });
          const routeMode = route || preferredRoute || 'direct';

          // Generate brief markdown (context may be null for standalone routing)
          const briefMd = context
            ? generateBriefMarkdown(context, [{ title, description, requiredSkills, intent, priority }], matches)
            : `## Task: ${title}\n${description || ''}\n\nSkills: ${requiredSkills.join(', ') || 'N/A'}`;

          // Determine target
          let targetMatch = matches[0] || null;
          if (to) {
            // If explicit target specified, find them in skill matches first
            const explicit = matches.find(m =>
              (m.userName && m.userName.toLowerCase().includes(to.toLowerCase())) ||
              m.userEmail.toLowerCase().includes(to.toLowerCase())
            );
            if (explicit) {
              targetMatch = explicit;
            } else {
              // Fallback: search ALL active connections (explicit assignment overrides skill matching)
              const allConns = await prisma.connection.findMany({
                where: { status: 'active', OR: [{ requesterId: userId }, { accepterId: userId }] },
                include: {
                  requester: { select: { id: true, name: true, email: true } },
                  accepter: { select: { id: true, name: true, email: true } },
                },
              });
              for (const conn of allConns) {
                const peer = conn.requesterId === userId ? conn.accepter : conn.requester;
                if (!peer) continue;
                const nameMatch = peer.name && peer.name.toLowerCase().includes(to.toLowerCase());
                const emailMatch = peer.email && peer.email.toLowerCase().includes(to.toLowerCase());
                if (nameMatch || emailMatch) {
                  targetMatch = {
                    userId: peer.id,
                    userName: peer.name || peer.email,
                    userEmail: peer.email,
                    connectionId: conn.id,
                    matchedSkills: [],
                    matchedTaskTypes: [],
                    score: 1,
                    capacity: 'available',
                    reasoning: `Explicitly assigned by operator to ${peer.name || peer.email}`,
                  };
                  break;
                }
              }
            }
          }

          // Store the brief
          const brief = await storeBrief({
            userId,
            type: 'task_decomposition',
            title: `Task: ${title}`,
            sourceCardId: resolvedCardId || undefined,
            sourceContactIds: context?.linkedContacts?.map(c => c.id) || [],
            briefMarkdown: briefMd,
            promptUsed: description,
            matchedUserId: targetMatch?.userId || undefined,
            matchReasoning: targetMatch?.reasoning || 'No matching connections found',
            matchedSkills: targetMatch ? [...targetMatch.matchedSkills, ...targetMatch.matchedTaskTypes] : undefined,
            routeType: routeMode,
            resultAction: targetMatch ? 'queued' : 'suggestion_made',
            status: targetMatch ? 'queued' : 'assembled',
          });

          // ── Create queue item — relay is created on DISPATCH, not here ──
          if (targetMatch && routeMode !== 'self') {
            const queueItem = await prisma.queueItem.create({
              data: {
                type: 'task',
                title: `📡 Route: "${title}" → ${targetMatch.userName || targetMatch.userEmail}`,
                description: description || `Task delegation via ${routeMode} relay`,
                priority: priority === 'urgent' ? 'urgent' : priority === 'high' ? 'high' : 'medium',
                status: 'ready',
                source: 'agent',
                userId,
                metadata: JSON.stringify({
                  type: 'task_route',
                  // ── All data needed for dispatch to create relay + deliver ──
                  targetUserId: targetMatch.userId,
                  targetUserName: targetMatch.userName || targetMatch.userEmail,
                  targetUserEmail: targetMatch.userEmail,
                  connectionId: targetMatch.connectionId,
                  routeMode,
                  intent,
                  taskTitle: title,
                  taskDescription: description || null,
                  taskPriority: priority,
                  taskDueDate: task.dueDate || null,
                  requiredSkills,
                  briefId: brief.id,
                  briefMarkdown: briefMd,
                  cardId: resolvedCardId || null,
                  cardTitle: context?.card?.title || null,
                  cardStatus: context?.card?.status || null,
                  matchScore: targetMatch.score,
                  matchReasoning: targetMatch.reasoning,
                  isAmbient: routeMode === 'ambient',
                }),
              },
            });

            // Log activity — queued, not yet dispatched
            await prisma.activityLog.create({
              data: {
                action: 'task_queued',
                actor: 'divi',
                summary: `Queued task "${title}" for ${targetMatch.userName || targetMatch.userEmail} — awaiting dispatch`,
                metadata: JSON.stringify({ briefId: brief.id, queueItemId: queueItem.id, cardId: resolvedCardId }),
                userId,
                cardId: resolvedCardId || null,
              },
            });

            results.push({
              task: title,
              routedTo: targetMatch.userName || targetMatch.userEmail,
              routeType: routeMode,
              matchScore: targetMatch.score,
              reasoning: targetMatch.reasoning,
              briefId: brief.id,
              queueItemId: queueItem.id,
              sourceCardId: resolvedCardId || null,
              status: 'queued',
            });
          } else {
            // No match — log as suggestion
            await prisma.activityLog.create({
              data: {
                action: 'task_decomposed',
                actor: 'divi',
                summary: `Decomposed task "${title}"${context?.card ? ` from card "${context.card.title}"` : ''} — no matching connection found`,
                metadata: JSON.stringify({ briefId: brief.id, cardId: resolvedCardId, availableMatches: matches.length }),
                userId,
                cardId: resolvedCardId || null,
              },
            });

            results.push({
              task: title,
              routedTo: null,
              routeType: 'self',
              topMatches: matches.slice(0, 3).map(m => ({ name: m.userName, score: m.score, reasoning: m.reasoning })),
              briefId: brief.id,
            });
          }
        }

        return { tag: name, success: true, data: { tasksRouted: results.length, results } };
      }

      // ── Orchestration: Assemble Brief ────────────────────────────────────────
      case 'assemble_brief': {
        const { assembleCardContext, findSkillMatches, generateBriefMarkdown, storeBrief } = await import('./brief-assembly');

        const { cardId, teamId: briefTeamId, projectId: briefProjectId } = params;
        if (!cardId) {
          return { tag: name, success: false, error: 'assemble_brief requires cardId' };
        }

        const context = await assembleCardContext(cardId, userId);
        if (!context) {
          return { tag: name, success: false, error: 'Card not found or not owned by user' };
        }

        // Find all potential skill matches based on card context
        const allSkills: string[] = [];
        const allTaskTypes: string[] = [];
        // Infer from card description and contacts
        if (context.card.description) {
          // Simple keyword extraction for common task types
          const desc = context.card.description.toLowerCase();
          if (desc.includes('research') || desc.includes('analysis')) allTaskTypes.push('research');
          if (desc.includes('review') || desc.includes('feedback')) allTaskTypes.push('review');
          if (desc.includes('design') || desc.includes('creative')) allTaskTypes.push('creative');
          if (desc.includes('technical') || desc.includes('develop')) allTaskTypes.push('technical');
          if (desc.includes('strategy') || desc.includes('plan')) allTaskTypes.push('strategy');
          if (desc.includes('finance') || desc.includes('budget')) allTaskTypes.push('finance');
          if (desc.includes('legal') || desc.includes('contract')) allTaskTypes.push('legal');
          if (desc.includes('sales') || desc.includes('pitch')) allTaskTypes.push('sales');
        }

        const matches = await findSkillMatches(userId, allSkills, allTaskTypes, { teamId: briefTeamId, projectId: briefProjectId });
        const briefMd = generateBriefMarkdown(context, [], matches);

        const brief = await storeBrief({
          userId,
          type: 'orchestration',
          title: `Brief: ${context.card.title}`,
          sourceCardId: cardId,
          sourceContactIds: context.linkedContacts.map(c => c.id),
          briefMarkdown: briefMd,
          routeType: 'self',
          resultAction: 'brief_assembled',
          status: 'assembled',
        });

        return {
          tag: name,
          success: true,
          data: {
            briefId: brief.id,
            cardTitle: context.card.title,
            linkedContacts: context.linkedContacts.length,
            potentialMatches: matches.slice(0, 5).map(m => ({
              name: m.userName,
              score: m.score,
              reasoning: m.reasoning,
            })),
            briefMarkdown: briefMd,
          },
        };
      }

      // ── Project Dashboard ─────────────────────────────────────────────────
      case 'project_dashboard': {
        const { assembleProjectContext, generateProjectDashboardMarkdown } = await import('./brief-assembly');

        const { projectId: dashProjectId } = params;
        if (!dashProjectId) {
          return { tag: name, success: false, error: 'project_dashboard requires projectId' };
        }

        const projCtx = await assembleProjectContext(dashProjectId, userId);
        if (!projCtx) {
          return { tag: name, success: false, error: 'Project not found or access denied' };
        }

        const dashMd = generateProjectDashboardMarkdown(projCtx);

        return {
          tag: name,
          success: true,
          data: {
            projectId: dashProjectId,
            projectName: projCtx.project.name,
            status: projCtx.project.status,
            visibility: projCtx.project.visibility,
            memberCount: projCtx.members.length,
            summary: projCtx.summary,
            dashboard: dashMd,
          },
        };
      }

      // ── Goal Actions ──
      case 'create_goal': {
        const { title, description, timeframe, deadline, impact, projectId: goalProjectId, teamId: goalTeamId } = params;
        if (!title) return { tag: name, success: false, error: 'create_goal requires title' };

        const goal = await prisma.goal.create({
          data: {
            title,
            description: description || null,
            timeframe: timeframe || 'quarter',
            deadline: deadline ? new Date(deadline) : null,
            impact: impact || 'medium',
            projectId: goalProjectId || null,
            teamId: goalTeamId || null,
            userId,
          },
        });
        return { tag: name, success: true, data: { goalId: goal.id, title: goal.title, impact: goal.impact, timeframe: goal.timeframe } };
      }

      case 'update_goal': {
        const { id: goalId, progress, status: goalStatus, title: goalTitle, description: goalDesc, impact: goalImpact } = params;
        if (!goalId) return { tag: name, success: false, error: 'update_goal requires id' };

        const existingGoal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
        if (!existingGoal) return { tag: name, success: false, error: 'Goal not found' };

        const goalUpdates: any = {};
        if (goalTitle !== undefined) goalUpdates.title = goalTitle;
        if (goalDesc !== undefined) goalUpdates.description = goalDesc;
        if (goalImpact !== undefined) goalUpdates.impact = goalImpact;
        if (goalStatus !== undefined) goalUpdates.status = goalStatus;
        if (progress !== undefined) goalUpdates.progress = Math.min(100, Math.max(0, Number(progress)));
        if (goalUpdates.progress >= 100 && !goalUpdates.status) goalUpdates.status = 'completed';

        const updatedGoal = await prisma.goal.update({ where: { id: goalId }, data: goalUpdates });
        return { tag: name, success: true, data: { goalId: updatedGoal.id, title: updatedGoal.title, status: updatedGoal.status, progress: updatedGoal.progress } };
      }

      // ── Job Board Actions ──
      case 'post_job': {
        const { title: jobTitle, description: jobDesc, taskType, urgency, compensation, requiredSkills, estimatedHours, projectId: jobProjectId, taskBreakdown } = params;
        if (!jobTitle) return { tag: name, success: false, error: 'post_job requires title' };

        // Validate project ownership if linking to existing
        if (jobProjectId) {
          const proj = await prisma.project.findFirst({
            where: { id: jobProjectId, OR: [{ createdById: userId }, { members: { some: { userId } } }] },
          });
          if (!proj) return { tag: name, success: false, error: 'Project not found or not accessible' };
        }

        const newJob = await prisma.networkJob.create({
          data: {
            title: jobTitle,
            description: jobDesc || jobTitle,
            taskType: taskType || 'custom',
            urgency: urgency || 'medium',
            compensation: compensation || null,
            requiredSkills: requiredSkills ? JSON.stringify(Array.isArray(requiredSkills) ? requiredSkills : requiredSkills.split(',').map((s: string) => s.trim())) : null,
            estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
            visibility: 'network',
            posterId: userId,
            projectId: jobProjectId || null,
            taskBreakdown: taskBreakdown ? JSON.stringify(Array.isArray(taskBreakdown) ? taskBreakdown : [taskBreakdown]) : null,
          },
        });
        return { tag: name, success: true, data: { jobId: newJob.id, title: newJob.title, status: newJob.status, message: 'Task posted to the network' } };
      }

      // ── Propose Task (queue for operator approval) ──────────────────────────
      case 'propose_task': {
        const { title: propTitle, description: propDesc, taskType: propTaskType, urgency: propUrgency, compensation: propComp, requiredSkills: propSkills, estimatedHours: propHours, projectId: propProjectId, taskBreakdown: propBreakdown, cardId: propCardId, routingSuggestion } = params;
        if (!propTitle) return { tag: name, success: false, error: 'propose_task requires title' };

        // Create a queue item for operator review
        const taskProposal = {
          type: 'propose_task',
          title: propTitle,
          description: propDesc || propTitle,
          taskType: propTaskType || 'custom',
          urgency: propUrgency || 'medium',
          compensation: propComp,
          requiredSkills: propSkills,
          estimatedHours: propHours,
          projectId: propProjectId,
          taskBreakdown: propBreakdown,
          sourceCardId: propCardId,
          routingSuggestion, // e.g. "assign_to_contributor", "post_to_network", "relay_to_connection"
        };

        const queueItem = await prisma.queueItem.create({
          data: {
            type: 'agent_suggestion',
            title: `📋 Post task: ${propTitle}`,
            description: propDesc ? propDesc.substring(0, 200) : `Proposed ${propTaskType || 'custom'} task`,
            priority: propUrgency === 'critical' || propUrgency === 'high' ? 'high' : 'medium',
            status: 'ready',
            source: 'agent',
            metadata: JSON.stringify(taskProposal),
            userId,
          },
        });

        return {
          tag: name,
          success: true,
          data: {
            queueItemId: queueItem.id,
            title: propTitle,
            message: `Task proposal "${propTitle}" added to your queue for review. Approve to post it to the network or assign directly.`,
          },
        };
      }

      case 'find_jobs': {
        const { findMatchingJobsForUser } = await import('@/lib/job-matcher');
        const jobMatches = await findMatchingJobsForUser(userId, 5);
        if (jobMatches.length === 0) {
          return { tag: name, success: true, data: { matches: [], message: 'No matching tasks found on the network right now. Check back later or update your profile skills.' } };
        }
        // Fetch job details for the matches
        const matchedJobs = await prisma.networkJob.findMany({
          where: { id: { in: jobMatches.map(m => m.jobId) } },
          select: { id: true, title: true, description: true, taskType: true, urgency: true, compensation: true, estimatedHours: true },
        });
        const results = jobMatches.map(m => {
          const job = matchedJobs.find((j: any) => j.id === m.jobId);
          return { ...m, job };
        });
        return { tag: name, success: true, data: { matches: results, message: `Found ${results.length} matching tasks on the network` } };
      }

      case 'entity_resolve': {
        // params: { query, surfaces? }
        if (!params.query) {
          return { tag: name, success: false, error: 'query is required (email, name, or domain)' };
        }
        const { resolveEntity } = await import('./entity-resolution');
        const resolution = await resolveEntity(userId, params.query, {
          surfaces: params.surfaces,
          limit: 30,
        });
        return { tag: name, success: true, data: resolution };
      }

      // ─── Job & Project Invite Actions ───────────────────────────────────────

      case 'accept_invite': {
        if (!params.inviteId) {
          return { tag: name, success: false, error: 'inviteId is required' };
        }
        const invite = await prisma.projectInvite.findUnique({
          where: { id: params.inviteId },
          include: { project: true, job: true },
        });
        if (!invite || invite.inviteeId !== userId) {
          return { tag: name, success: false, error: 'Invite not found or not yours' };
        }
        if (invite.status !== 'pending') {
          return { tag: name, success: false, error: `Invite already ${invite.status}` };
        }
        // Accept: update invite + create project membership
        await prisma.$transaction([
          prisma.projectInvite.update({ where: { id: params.inviteId }, data: { status: 'accepted', acceptedAt: new Date() } }),
          prisma.projectMember.create({
            data: { projectId: invite.projectId, userId, role: invite.role || 'member' },
          }),
        ]);
        return { tag: name, success: true, data: { message: `Accepted invite to project "${invite.project?.name}". You are now a ${invite.role || 'member'}.` } };
      }

      case 'decline_invite': {
        if (!params.inviteId) {
          return { tag: name, success: false, error: 'inviteId is required' };
        }
        const decInvite = await prisma.projectInvite.findUnique({
          where: { id: params.inviteId },
          include: { project: true },
        });
        if (!decInvite || decInvite.inviteeId !== userId) {
          return { tag: name, success: false, error: 'Invite not found or not yours' };
        }
        await prisma.projectInvite.update({ where: { id: params.inviteId }, data: { status: 'declined', declinedAt: new Date() } });
        return { tag: name, success: true, data: { message: `Declined invite to project "${decInvite.project?.name}".` } };
      }

      case 'list_invites': {
        const invites = await prisma.projectInvite.findMany({
          where: { inviteeId: userId, status: 'pending' },
          include: {
            project: { select: { name: true, description: true } },
            inviter: { select: { name: true, email: true } },
            job: { select: { title: true, compensationType: true, compensationAmount: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        return { tag: name, success: true, data: { count: invites.length, invites: invites.map((i: any) => ({
          id: i.id, project: i.project?.name, from: i.inviter?.name || i.inviter?.email,
          role: i.role, job: i.job ? { title: i.job.title, compensation: `$${i.job.compensationAmount}/${i.job.compensationType}` } : null,
        })) } };
      }

      case 'complete_job': {
        if (!params.jobId) {
          return { tag: name, success: false, error: 'jobId is required' };
        }
        const completeJob = await prisma.networkJob.findUnique({ where: { id: params.jobId } });
        if (!completeJob) return { tag: name, success: false, error: 'Job not found' };
        if (completeJob.posterId !== userId && completeJob.assigneeId !== userId) {
          return { tag: name, success: false, error: 'Only the poster or assigned user can complete a job' };
        }
        await prisma.networkJob.update({ where: { id: params.jobId }, data: { status: 'completed' } });
        // Also complete any active contracts
        await prisma.jobContract.updateMany({
          where: { jobId: params.jobId, status: 'active' },
          data: { status: 'completed', endDate: new Date() },
        });
        return { tag: name, success: true, data: { message: `Job "${completeJob.title}" marked as completed.` } };
      }

      case 'review_job': {
        if (!params.jobId || !params.rating) {
          return { tag: name, success: false, error: 'jobId and rating (1-5) are required' };
        }
        const reviewJob = await prisma.networkJob.findUnique({ where: { id: params.jobId } });
        if (!reviewJob) return { tag: name, success: false, error: 'Job not found' };
        const isReviewerPoster = reviewJob.posterId === userId;
        const revieweeId = isReviewerPoster ? reviewJob.assigneeId : reviewJob.posterId;
        if (!revieweeId) return { tag: name, success: false, error: 'No counterparty to review' };
        const reviewType = isReviewerPoster ? 'poster_to_worker' : 'worker_to_poster';
        await prisma.jobReview.create({
          data: {
            jobId: params.jobId,
            reviewerId: userId,
            revieweeId,
            rating: Math.min(5, Math.max(1, Number(params.rating))),
            comment: params.comment || '',
            type: reviewType,
          },
        });
        return { tag: name, success: true, data: { message: `Review submitted for job "${reviewJob.title}".` } };
      }

      // ─── Marketplace Actions ────────────────────────────────────────────────

      case 'list_marketplace': {
        const where: any = { status: 'active' };
        if (params.category) where.category = params.category;
        const agents = await prisma.marketplaceAgent.findMany({
          where,
          select: {
            id: true, name: true, description: true, category: true,
            pricingModel: true, pricePerTask: true, avgRating: true,
            totalExecutions: true, developerName: true, developerId: true,
            taskTypes: true,
          },
          orderBy: { avgRating: 'desc' },
          take: 20,
        });
        // Check which agents the user has installed
        const userSubs = await prisma.marketplaceSubscription.findMany({
          where: { userId, agentId: { in: agents.map((a: any) => a.id) } },
          select: { agentId: true, installed: true, status: true },
        });
        const subMap = new Map<string, any>(userSubs.map((s: any) => [s.agentId, s]));
        const enriched = agents.map((a: any) => {
          const sub = subMap.get(a.id);
          let taskTypes: string[] = [];
          try { taskTypes = a.taskTypes ? JSON.parse(a.taskTypes) : []; } catch {}
          return {
            id: a.id, name: a.name, description: a.description, category: a.category,
            pricingModel: a.pricingModel, pricePerTask: a.pricePerTask,
            avgRating: a.avgRating, totalExecutions: a.totalExecutions,
            developerName: a.developerName,
            isOwnAgent: a.developerId === userId,
            installed: sub?.installed ?? false,
            subscribed: sub?.status === 'active',
            taskTypes,
          };
        });
        return { tag: name, success: true, data: { count: enriched.length, agents: enriched } };
      }

      case 'execute_agent': {
        if (!params.agentId || !params.prompt) {
          return { tag: name, success: false, error: 'agentId and prompt are required' };
        }
        const agent = await prisma.marketplaceAgent.findUnique({ where: { id: params.agentId } });
        if (!agent || agent.status !== 'active') return { tag: name, success: false, error: 'Agent not found or inactive' };

        // Determine if this is the user's own agent (no platform fees)
        const isOwnAgent = agent.developerId === userId;

        // ─── FVP Build 522 §2 behavior #5: marketplace agent tasks must pass
        //     the approval gate unless the user has queueAutoApprove enabled.
        //     Explicit bypass is allowed via params.skipQueue === true (used by
        //     the queue dispatcher itself once the user confirms).
        const execUser = await prisma.user.findUnique({ where: { id: userId }, select: { queueAutoApprove: true } });
        const skipQueue = params.skipQueue === true;
        if (!skipQueue && execUser?.queueAutoApprove !== true) {
          const pendingItem = await prisma.queueItem.create({
            data: {
              type: 'agent_suggestion',
              title: `Run ${agent.name}`,
              description: String(params.prompt).substring(0, 500),
              priority: params.priority || 'medium',
              status: 'pending_confirmation',
              source: 'agent',
              userId,
              metadata: JSON.stringify({
                kind: 'marketplace_execute',
                agentId: params.agentId,
                agentName: agent.name,
                prompt: params.prompt,
                isOwnAgent,
              }),
            },
          });
          return {
            tag: name,
            success: true,
            data: {
              queued: true,
              pending_confirmation: true,
              queueItemId: pendingItem.id,
              agentName: agent.name,
              message: `Queued "${agent.name}" for your approval before running.`,
            },
          };
        }

        // Build Integration Kit context for the response
        let integrationKitContext = '';
        if (agent.contextInstructions) {
          integrationKitContext += `\n[Integration Kit — Context Instructions]: ${agent.contextInstructions}`;
        }
        if (agent.contextPreparation) {
          try {
            const steps = JSON.parse(agent.contextPreparation);
            if (Array.isArray(steps) && steps.length > 0) {
              integrationKitContext += `\n[Pre-flight Checklist]: ${steps.map((s: string, i: number) => `${i + 1}. ${s}`).join(' → ')}`;
            }
          } catch { /* ignore */ }
        }
        if (agent.executionNotes) {
          integrationKitContext += `\n[Execution Notes]: ${agent.executionNotes}`;
        }

        // Create execution record (no fees for own agents)
        const execution = await prisma.marketplaceExecution.create({
          data: {
            agentId: params.agentId,
            userId,
            taskInput: params.prompt,
            status: 'pending',
            feePercent: isOwnAgent ? 0 : getPlatformFeePercent(!isOwnAgent),
          },
        });
        // Call the agent endpoint
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (agent.authMethod === 'bearer' && agent.authToken) headers['Authorization'] = `Bearer ${agent.authToken}`;
          else if (agent.authMethod === 'api_key' && agent.authToken) headers['X-API-Key'] = agent.authToken;
          else if (agent.authMethod === 'header' && agent.authHeader && agent.authToken) headers[agent.authHeader] = agent.authToken;
          const resp = await fetch(agent.endpointUrl, { method: 'POST', headers, body: JSON.stringify({ prompt: params.prompt, userId }), signal: AbortSignal.timeout(30000) });
          const result = await resp.text();
          await prisma.marketplaceExecution.update({ where: { id: execution.id }, data: { status: 'completed', taskOutput: result, completedAt: new Date() } });
          return {
            tag: name, success: true,
            data: {
              executionId: execution.id,
              result: result.substring(0, 2000),
              isOwnAgent,
              ...(integrationKitContext ? { integrationKit: integrationKitContext } : {}),
            },
          };
        } catch (err: any) {
          await prisma.marketplaceExecution.update({ where: { id: execution.id }, data: { status: 'failed', errorMessage: err.message } });
          return { tag: name, success: false, error: `Agent execution failed: ${err.message}` };
        }
      }

      case 'subscribe_agent': {
        if (!params.agentId) {
          return { tag: name, success: false, error: 'agentId is required' };
        }
        const existing = await prisma.marketplaceSubscription.findFirst({
          where: { agentId: params.agentId, userId, status: 'active' },
        });
        if (existing) return { tag: name, success: true, data: { message: 'Already subscribed to this agent.' } };
        await prisma.marketplaceSubscription.create({
          data: { agentId: params.agentId, userId, status: 'active' },
        });
        return { tag: name, success: true, data: { message: 'Subscribed to agent.' } };
      }

      // ─── Federation Intelligence Actions ────────────────────────────────────

      case 'serendipity_matches': {
        try {
          const { computeSerendipityMatches } = await import('./entity-resolution');
          const matches = await computeSerendipityMatches(userId);
          return { tag: name, success: true, data: matches };
        } catch (e: any) {
          return { tag: name, success: false, error: e.message || 'Serendipity matching not available' };
        }
      }

      case 'network_briefing': {
        try {
          const { generateNetworkBriefing } = await import('./brief-assembly');
          const briefing = await generateNetworkBriefing(userId);
          return { tag: name, success: true, data: briefing };
        } catch (e: any) {
          return { tag: name, success: false, error: e.message || 'Network briefing not available' };
        }
      }

      case 'route_task': {
        if (!params.taskDescription) {
          return { tag: name, success: false, error: 'taskDescription is required' };
        }
        try {
          const { intelligentTaskRoute } = await import('./brief-assembly');
          const result = await intelligentTaskRoute(userId, {
            description: params.taskDescription,
            skills: params.taskSkills || [],
            taskType: params.taskType || 'custom',
          });
          return { tag: name, success: true, data: result };
        } catch (e: any) {
          return { tag: name, success: false, error: e.message || 'Task routing not available' };
        }
      }

      // ── Marketplace Install / Uninstall ─────────────────────────────────────

      case 'install_agent': {
        const agentId = params.agentId;
        if (!agentId) return { tag: name, success: false, error: 'agentId is required' };
        const agent = await prisma.marketplaceAgent.findUnique({ where: { id: agentId } });
        if (!agent || agent.status !== 'active') return { tag: name, success: false, error: 'Agent not found or inactive' };

        // For paid agents, require existing active subscription
        if (agent.pricingModel !== 'free') {
          const existingSub = await prisma.marketplaceSubscription.findUnique({
            where: { agentId_userId: { agentId, userId } },
          });
          if (!existingSub || existingSub.status !== 'active') {
            return { tag: name, success: false, error: `This is a ${agent.pricingModel} agent. Subscribe first with [[subscribe_agent:{"agentId":"${agentId}"}]], then install.` };
          }
          await prisma.marketplaceSubscription.update({
            where: { id: existingSub.id },
            data: { installed: true, installedAt: new Date(), uninstalledAt: null },
          });
        } else {
          // Free agents — upsert subscription with installed flag
          await prisma.marketplaceSubscription.upsert({
            where: { agentId_userId: { agentId, userId } },
            create: { agentId, userId, status: 'active', installed: true, installedAt: new Date() },
            update: { installed: true, installedAt: new Date(), uninstalledAt: null },
          });
        }

        // Build memory entries from Integration Kit
        const prefix = `agent:${agentId}`;
        const memEntries: { key: string; value: string; category: string; tier: number }[] = [
          { key: `${prefix}:identity`, value: JSON.stringify({ name: agent.name, slug: agent.slug, category: agent.category, inputFormat: agent.inputFormat, outputFormat: agent.outputFormat, pricingModel: agent.pricingModel, developerName: agent.developerName, isOwnAgent: agent.developerId === userId }), category: 'agent_toolkit', tier: 1 },
        ];
        if (agent.taskTypes) memEntries.push({ key: `${prefix}:task_types`, value: agent.taskTypes, category: 'agent_toolkit', tier: 1 });
        if (agent.contextInstructions) memEntries.push({ key: `${prefix}:context_instructions`, value: agent.contextInstructions, category: 'agent_toolkit', tier: 2 });
        if (agent.contextPreparation) memEntries.push({ key: `${prefix}:preparation_steps`, value: agent.contextPreparation, category: 'agent_toolkit', tier: 2 });
        if (agent.requiredInputSchema) memEntries.push({ key: `${prefix}:input_schema`, value: agent.requiredInputSchema, category: 'agent_toolkit', tier: 1 });
        if (agent.outputSchema) memEntries.push({ key: `${prefix}:output_schema`, value: agent.outputSchema, category: 'agent_toolkit', tier: 1 });
        if (agent.usageExamples) memEntries.push({ key: `${prefix}:usage_examples`, value: agent.usageExamples, category: 'agent_toolkit', tier: 3 });
        if (agent.executionNotes) memEntries.push({ key: `${prefix}:execution_notes`, value: agent.executionNotes, category: 'agent_toolkit', tier: 2 });

        for (const entry of memEntries) {
          await prisma.memoryItem.upsert({
            where: { userId_key: { userId, key: entry.key } },
            create: { userId, key: entry.key, value: entry.value, category: entry.category, tier: entry.tier, source: 'system' },
            update: { value: entry.value, category: entry.category, tier: entry.tier },
          });
        }
        return { tag: name, success: true, data: { message: `${agent.name} installed into your Divi's toolkit. ${memEntries.length} knowledge entries loaded.`, agentId, agentName: agent.name } };
      }

      case 'uninstall_agent': {
        const uAgentId = params.agentId;
        if (!uAgentId) return { tag: name, success: false, error: 'agentId is required' };

        const sub = await prisma.marketplaceSubscription.findUnique({
          where: { agentId_userId: { agentId: uAgentId, userId } },
        });
        if (sub) {
          await prisma.marketplaceSubscription.update({
            where: { id: sub.id },
            data: { installed: false, uninstalledAt: new Date() },
          });
        }
        // Delete all memory entries — Divi forgets
        const deleted = await prisma.memoryItem.deleteMany({
          where: { userId, key: { startsWith: `agent:${uAgentId}` } },
        });
        return { tag: name, success: true, data: { message: `Agent uninstalled. ${deleted.count} knowledge entries removed from Divi's memory.`, agentId: uAgentId, memoryEntriesRemoved: deleted.count } };
      }

      // ── Marketplace Suggestions (smart search) ──────────────────────
      case 'suggest_marketplace': {
        const query = params.query || params.taskDescription || params.title || '';
        if (!query) return { tag: name, success: false, error: 'query is required' };

        const suggestions = await searchMarketplaceSuggestions(userId, query, 6);
        return {
          tag: name,
          success: true,
          data: {
            query,
            suggestions,
            message: suggestions.length > 0
              ? `Found ${suggestions.length} marketplace items that might help:`
              : 'No matching agents or capabilities found in the Bubble Store.',
          },
        };
      }

      case 'merge_cards': {
        // Merge sourceCardId INTO targetCardId — all tasks, contacts, artifacts move to target; source is deleted
        const { targetCardId, sourceCardId } = params;
        if (!targetCardId || !sourceCardId) return { tag: name, success: false, error: 'targetCardId and sourceCardId are required' };
        if (targetCardId === sourceCardId) return { tag: name, success: false, error: 'Cannot merge a card into itself' };

        // Verify both cards belong to user
        const [target, source] = await Promise.all([
          prisma.kanbanCard.findFirst({ where: { id: targetCardId, userId }, include: { checklist: true } }),
          prisma.kanbanCard.findFirst({ where: { id: sourceCardId, userId }, include: { checklist: true, contacts: true } }),
        ]);
        if (!target) return { tag: name, success: false, error: 'Target card not found' };
        if (!source) return { tag: name, success: false, error: 'Source card not found' };

        // Move all checklist items from source to target
        const movedTasks = await prisma.checklistItem.updateMany({
          where: { cardId: sourceCardId },
          data: { cardId: targetCardId },
        });

        // Re-order moved items so they come after existing target items
        const movedItems = await prisma.checklistItem.findMany({
          where: { cardId: targetCardId },
          orderBy: { order: 'asc' },
        });
        for (let i = 0; i < movedItems.length; i++) {
          if (movedItems[i].order !== i) {
            await prisma.checklistItem.update({ where: { id: movedItems[i].id }, data: { order: i } });
          }
        }

        // Move CardContacts — upsert to avoid duplicates
        for (const cc of source.contacts) {
          await prisma.cardContact.upsert({
            where: { cardId_contactId: { cardId: targetCardId, contactId: cc.contactId } },
            create: { cardId: targetCardId, contactId: cc.contactId, role: cc.role, involvement: (cc as any).involvement || 'contributor', canDelegate: (cc as any).canDelegate || false },
            update: {},  // keep existing if already linked
          });
        }

        // Move CardArtifacts — upsert to avoid duplicates
        const sourceArtifacts = await prisma.cardArtifact.findMany({ where: { cardId: sourceCardId } });
        for (const art of sourceArtifacts) {
          await prisma.cardArtifact.upsert({
            where: { cardId_artifactType_artifactId: { cardId: targetCardId, artifactType: art.artifactType, artifactId: art.artifactId } },
            create: { cardId: targetCardId, artifactType: art.artifactType, artifactId: art.artifactId, label: art.label, metadata: art.metadata || undefined },
            update: {},
          });
        }

        // Move direct FK artifact links from source to target (emails, documents, etc.)
        await prisma.kanbanCard.update({
          where: { id: targetCardId },
          data: {
            // Append source description to target if source has one
            description: source.description
              ? (target.description ? target.description + '\n\n---\nMerged from "' + source.title + '":\n' + source.description : source.description)
              : target.description,
          },
        });

        // Delete source card (cascades CardContact and CardArtifact for source)
        await prisma.kanbanCard.delete({ where: { id: sourceCardId } });

        return {
          tag: name, success: true,
          data: {
            targetCardId,
            deletedSourceCardId: sourceCardId,
            deletedSourceTitle: source.title,
            tasksMoved: movedTasks.count,
            contactsMoved: source.contacts.length,
            artifactsMoved: sourceArtifacts.length,
          },
        };
      }

      // ── Integration Sync ─────────────────────────────────────────────────
      case 'sync_signal': {
        const syncService = params.service || 'all'; // email | calendar | drive | all
        const syncIdentity = params.identity || 'operator';
        if (syncService === 'all') {
          const { syncAllGoogleServices } = await import('@/lib/google-sync');
          const result = await syncAllGoogleServices(userId);
          return { tag: name, success: true, data: result };
        }
        // Find the integration for this service + identity
        const syncAccount = await prisma.integrationAccount.findFirst({
          where: { userId, service: syncService, identity: syncIdentity, provider: 'google' },
        });
        if (!syncAccount) {
          return { tag: name, success: false, error: `No Google ${syncService} integration found for ${syncIdentity}` };
        }
        const { syncGmail, syncCalendar, syncDrive } = await import('@/lib/google-sync');
        let synced = 0;
        if (syncService === 'email') synced = await syncGmail(syncAccount as any);
        else if (syncService === 'calendar') synced = await syncCalendar(syncAccount as any);
        else if (syncService === 'drive') synced = await syncDrive(syncAccount as any);

        await prisma.integrationAccount.update({
          where: { id: syncAccount.id },
          data: { lastSyncAt: new Date() },
        });
        return { tag: name, success: true, data: { service: syncService, synced } };
      }

      case 'generate_meeting_notes': {
        // params: { eventId, recordingId? }
        if (!params.eventId) {
          return { tag: name, success: false, error: 'eventId is required.' };
        }
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'REPLACE_WITH_YOUR_GEMINI_API_KEY') {
          return { tag: name, success: false, error: 'GEMINI_API_KEY is not configured. The operator needs to add their Gemini API key.' };
        }
        const { generateAndSaveMeetingNotes } = await import('@/lib/gemini-meeting-notes');
        const result = await generateAndSaveMeetingNotes(userId, params.eventId, params.recordingId);
        return {
          tag: name,
          success: true,
          data: {
            documentId: result.documentId,
            summary: result.notes.summary,
            actionItems: result.notes.actionItems,
            topics: result.notes.topics,
            sentiment: result.notes.sentiment,
          },
        };
      }

      case 'show_settings_widget': {
        // params: { group: 'working_style' | 'triage' | 'goals' | 'identity' | 'all' }
        const group = params.group || 'all';
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { workingStyle: true, triageSettings: true, goalsEnabled: true, diviName: true },
        });
        if (!user) return { tag: name, success: false, error: 'User not found' };

        const { getSettingsWidgets } = await import('@/lib/onboarding-phases');
        const ws = user.workingStyle ? JSON.parse(String(user.workingStyle)) : null;
        const ts = user.triageSettings ? JSON.parse(String(user.triageSettings)) : null;
        const widgets = getSettingsWidgets(group, ws, ts, user.goalsEnabled, user.diviName || 'Divi');

        return {
          tag: name,
          success: true,
          data: {
            isSettingsWidget: true,
            widgets,
            settingsGroup: group,
            onboardingPhase: -1,
          },
        };
      }

      // ── Linked Kards: explicit link action ────────────────────────────
      case 'link_cards': {
        const { fromCardId, toCardId, linkType } = params;
        if (!fromCardId || !toCardId) {
          return { tag: name, success: false, error: 'link_cards requires fromCardId and toCardId' };
        }
        // Verify at least one card belongs to this user
        const [fromCard, toCard] = await Promise.all([
          prisma.kanbanCard.findFirst({ where: { id: fromCardId }, select: { id: true, userId: true, title: true } }),
          prisma.kanbanCard.findFirst({ where: { id: toCardId }, select: { id: true, userId: true, title: true } }),
        ]);
        if (!fromCard || !toCard) {
          return { tag: name, success: false, error: 'One or both cards not found' };
        }
        if (fromCard.userId !== userId && toCard.userId !== userId) {
          return { tag: name, success: false, error: 'At least one card must belong to the current user' };
        }
        const { linkCards: linkCardsFn } = await import('./card-links');
        const link = await linkCardsFn(fromCardId, toCardId, { linkType: linkType || 'collaboration' });
        return { tag: name, success: !!link, data: link ? { linkId: link.id, from: fromCard.title, to: toCard.title } : undefined };
      }

      // ── Google Connect Button Widget ──────────────────────────────────
      case 'show_google_connect': {
        // Returns metadata that ChatView renders as an interactive Google Connect button.
        // Works both during onboarding and in regular chat.
        const identity = params.identity || 'operator';
        const accountIndex = params.accountIndex ?? 0;
        const label = params.label || (identity === 'agent' ? '🤖 Connect Divi\'s Gmail' : '🔗 Connect Gmail & Calendar');
        const description = params.description || 'Grant access to read your email and calendar so Divi can help you manage them.';

        // Check if already connected
        const existingAccount = await prisma.integrationAccount.findFirst({
          where: { userId, identity, service: 'email', isActive: true },
          select: { emailAddress: true },
        });

        return {
          tag: name,
          success: true,
          data: {
            widgetType: 'google_connect',
            identity,
            accountIndex,
            label,
            description,
            connected: !!existingAccount,
            connectedEmail: existingAccount?.emailAddress || null,
          },
        };
      }

      // ── Project → Team Assignment ──
      case 'assign_team_to_project': {
        // params: { projectId OR projectName, teamId OR teamName }
        let projectId = params.projectId;
        let teamId = params.teamId;

        // Resolve project by name if no ID
        if (!projectId && params.projectName) {
          const project = await prisma.project.findFirst({
            where: {
              createdById: userId,
              name: { contains: params.projectName, mode: 'insensitive' as any },
            },
            select: { id: true, name: true },
          });
          if (!project) return { tag: name, success: false, error: `Project "${params.projectName}" not found` };
          projectId = project.id;
        }
        if (!projectId) return { tag: name, success: false, error: 'Missing projectId or projectName' };

        // Resolve team by name if no ID
        if (!teamId && params.teamName) {
          const team = await prisma.team.findFirst({
            where: {
              name: { contains: params.teamName, mode: 'insensitive' as any },
              OR: [
                { createdById: userId },
                { members: { some: { userId } } },
              ],
            },
            select: { id: true, name: true },
          });
          if (!team) return { tag: name, success: false, error: `Team "${params.teamName}" not found` };
          teamId = team.id;
        }
        if (!teamId) return { tag: name, success: false, error: 'Missing teamId or teamName' };

        // Verify user has access to the project
        const membership = await prisma.projectMember.findFirst({
          where: { projectId, userId, role: { in: ['lead', 'contributor'] } },
        });
        if (!membership) return { tag: name, success: false, error: 'Not authorized to modify this project' };

        // Assign team and update visibility
        const updated = await prisma.project.update({
          where: { id: projectId },
          data: { teamId, visibility: 'team' },
          select: { id: true, name: true, team: { select: { id: true, name: true } } },
        });

        // Add all team members as project contributors if not already members
        const teamMembers = await prisma.teamMember.findMany({
          where: { teamId },
          select: { userId: true },
        });
        for (const tm of teamMembers) {
          if (!tm.userId) continue;
          const existing = await prisma.projectMember.findFirst({
            where: { projectId, userId: tm.userId },
          });
          if (!existing) {
            await prisma.projectMember.create({
              data: { projectId, userId: tm.userId, role: 'contributor' },
            });
          }
        }

        logActivity({ userId, action: 'project_team_assigned', summary: `Assigned project "${updated.name}" to team "${updated.team?.name}"`, metadata: { projectId, teamId } });
        return { tag: name, success: true, data: { projectId: updated.id, projectName: updated.name, teamId, teamName: updated.team?.name } };
      }

      // ── Create Project ─────────────────────────────────────────────────
      case 'create_project': {
        // params: { name, description?, visibility?, color?, members?: [{ name?, email?, connectionId?, role? }] }
        const projName = params.name || params.title;
        if (!projName?.trim()) return { tag: name, success: false, error: 'Project name is required' };

        const vis = ['private', 'team', 'open'].includes(params.visibility) ? params.visibility : 'private';

        const project = await prisma.project.create({
          data: {
            name: projName.trim(),
            description: params.description || null,
            color: params.color || null,
            visibility: vis,
            createdById: userId,
            members: { create: { userId, role: 'lead' } },
          },
        });

        logActivity({ userId, action: 'project_created', summary: `Created project "${project.name}"`, metadata: { projectId: project.id } });

        // Auto-invite members if provided
        const inviteResults: any[] = [];
        const members = params.members || [];
        for (const m of members) {
          try {
            // Resolve the member — by connectionId, email, or name search
            let inviteeId: string | null = null;
            let inviteeEmail: string | null = m.email || null;
            let connId: string | null = m.connectionId || null;
            const searchName = (m.name || m.to || '').toLowerCase().replace(/^@/, '');

            if (!inviteeId && inviteeEmail) {
              const u = await prisma.user.findUnique({ where: { email: inviteeEmail }, select: { id: true } });
              if (u) inviteeId = u.id;
            }

            // Search connections by name/nickname if no direct ID
            if (!inviteeId && !connId && searchName) {
              const allConns = await prisma.connection.findMany({
                where: { OR: [{ requesterId: userId }, { accepterId: userId }], status: 'active' },
                include: {
                  requester: { select: { id: true, name: true, email: true, username: true } },
                  accepter: { select: { id: true, name: true, email: true, username: true } },
                },
              });
              const match = allConns.find((c: any) => {
                const vals = [
                  c.nickname, c.peerNickname, c.peerUserName, c.peerUserEmail,
                  c.requester?.name, c.requester?.email, c.requester?.username,
                  c.accepter?.name, c.accepter?.email, c.accepter?.username,
                ].map(v => (v || '').toLowerCase());
                return vals.some(v => v.includes(searchName));
              });
              if (match) {
                connId = match.id;
                inviteeId = match.requesterId === userId ? match.accepterId : match.requesterId;
                if (!inviteeEmail) {
                  const peer = match.requesterId === userId ? match.accepter : match.requester;
                  inviteeEmail = peer?.email || match.peerUserEmail || null;
                }
              }
            }

            if (!inviteeId && !connId) {
              inviteResults.push({ name: m.name || m.email, status: 'not_found', error: 'Could not resolve user' });
              continue;
            }

            // Check if already a member (creator)
            if (inviteeId === userId) {
              inviteResults.push({ name: m.name || m.email, status: 'skipped', reason: 'Already the project creator' });
              continue;
            }

            // Create project invite with queue item for recipient
            const invite = await prisma.projectInvite.create({
              data: {
                projectId: project.id,
                inviterId: userId,
                inviteeId,
                inviteeEmail,
                connectionId: connId,
                role: m.role || 'contributor',
              },
            });

            // Queue item so recipient sees the invite
            if (inviteeId) {
              await prisma.queueItem.create({
                data: {
                  type: 'notification',
                  title: `📋 Project invite: ${project.name}`,
                  description: `You've been invited to join "${project.name}" as ${m.role || 'contributor'}.`,
                  priority: 'medium',
                  status: 'ready',
                  source: 'agent',
                  userId: inviteeId,
                  projectId: project.id,
                  metadata: JSON.stringify({ type: 'project_invite', inviteId: invite.id }),
                },
              });

              // Comms message so their Divi sees it
              await prisma.commsMessage.create({
                data: {
                  sender: 'system',
                  content: `📋 You've been invited to project "${project.name}" as ${m.role || 'contributor'}.`,
                  state: 'new',
                  priority: 'medium',
                  userId: inviteeId,
                  metadata: JSON.stringify({ type: 'project_invite', inviteId: invite.id, projectId: project.id }),
                },
              });
            }

            logActivity({ userId, action: 'project_invite_sent', summary: `Invited ${m.name || inviteeEmail || 'user'} to "${project.name}"`, metadata: { projectId: project.id, inviteId: invite.id } });

            // Federation push — notify remote instance if connection is federated
            if (connId) {
              const senderU = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
              const { pushNotificationToFederatedInstance } = await import('./federation-push');
              pushNotificationToFederatedInstance(connId, {
                type: 'project_invite',
                fromUserName: senderU?.name || 'A DiviDen user',
                fromUserEmail: senderU?.email || '',
                title: `Project invite: ${project.name}`,
                body: `You've been invited to join "${project.name}" as ${m.role || 'contributor'}.`,
                metadata: { projectId: project.id, inviteId: invite.id, role: m.role || 'contributor' },
              }).catch(() => {});
            }

            inviteResults.push({ name: m.name || inviteeEmail, status: 'invited', inviteId: invite.id });
          } catch (invErr: any) {
            inviteResults.push({ name: m.name || m.email, status: 'error', error: invErr.message });
          }
        }

        return {
          tag: name,
          success: true,
          data: { projectId: project.id, projectName: project.name, visibility: vis, memberInvites: inviteResults },
        };
      }

      // ── Invite to Project ──────────────────────────────────────────────
      case 'invite_to_project': {
        // params: { projectId? OR projectName?, members: [{ name?, email?, connectionId?, role? }] }
        let projId = params.projectId;

        // Resolve by name
        if (!projId && params.projectName) {
          const proj = await prisma.project.findFirst({
            where: { createdById: userId, name: { contains: params.projectName, mode: 'insensitive' as any } },
            select: { id: true, name: true },
          });
          if (!proj) return { tag: name, success: false, error: `Project "${params.projectName}" not found` };
          projId = proj.id;
        }
        if (!projId) return { tag: name, success: false, error: 'Missing projectId or projectName' };

        // Verify user is lead/creator
        const proj = await prisma.project.findUnique({ where: { id: projId }, include: { members: true } });
        if (!proj) return { tag: name, success: false, error: 'Project not found' };
        const isLead = proj.createdById === userId || proj.members.some((pm: any) => pm.userId === userId && pm.role === 'lead');
        if (!isLead) return { tag: name, success: false, error: 'Only project leads can invite members' };

        const invResults: any[] = [];
        const invMembers = params.members || [];
        for (const m of invMembers) {
          try {
            let inviteeId: string | null = null;
            let inviteeEmail: string | null = m.email || null;
            let connId: string | null = m.connectionId || null;
            const searchN = (m.name || m.to || '').toLowerCase().replace(/^@/, '');

            if (!inviteeId && inviteeEmail) {
              const u = await prisma.user.findUnique({ where: { email: inviteeEmail }, select: { id: true } });
              if (u) inviteeId = u.id;
            }

            if (!inviteeId && !connId && searchN) {
              const allConns = await prisma.connection.findMany({
                where: { OR: [{ requesterId: userId }, { accepterId: userId }], status: 'active' },
                include: {
                  requester: { select: { id: true, name: true, email: true, username: true } },
                  accepter: { select: { id: true, name: true, email: true, username: true } },
                },
              });
              // Score-based matching: exact > contains > first-name
              let match: any = null;
              let bestScore = 0;
              for (const c of allConns as any[]) {
                const peer = c.requesterId === userId ? c.accepter : c.requester;
                const vals = [
                  c.nickname, c.peerNickname, c.peerUserName, c.peerUserEmail,
                  peer?.name, peer?.email, peer?.username,
                ].filter(Boolean).map((v: string) => v.toLowerCase());
                // Exact match on any field
                if (vals.some(v => v === searchN)) { match = c; break; }
                // Contains match
                if (vals.some(v => v.includes(searchN)) && bestScore < 2) { match = c; bestScore = 2; }
                // First-name match (e.g. "jaron" matches "jaron ray hinds")
                if (bestScore < 1) {
                  const firstNames = vals.map(v => v.split(/[\s@.]+/)[0]);
                  if (firstNames.some(fn => fn === searchN)) { match = c; bestScore = 1; }
                }
              }
              if (match) {
                connId = match.id;
                inviteeId = match.requesterId === userId ? match.accepterId : match.requesterId;
                if (!inviteeEmail) {
                  const peer = match.requesterId === userId ? match.accepter : match.requester;
                  inviteeEmail = peer?.email || match.peerUserEmail || null;
                }
              }
            }

            if (!inviteeId && !connId) {
              console.warn(`[invite_to_project] Could not resolve member: name="${m.name}", email="${m.email}", searchN="${searchN}"`);
              invResults.push({ name: m.name || m.email, status: 'not_found', searched: searchN || m.email || 'unknown' });
              continue;
            }

            // Skip if already a member
            if (inviteeId && proj.members.some((pm: any) => pm.userId === inviteeId)) {
              invResults.push({ name: m.name || inviteeEmail, status: 'already_member' });
              continue;
            }

            // Check for existing invite — re-send notification if still pending instead of silently skipping
            let invite: any = null;
            let isResend = false;
            if (inviteeId) {
              const existingInv = await prisma.projectInvite.findUnique({
                where: { projectId_inviteeId: { projectId: projId!, inviteeId } },
              });
              if (existingInv) {
                if (existingInv.status === 'accepted') {
                  invResults.push({ name: m.name || inviteeEmail, status: 'already_member', note: 'Invite already accepted' });
                  continue;
                }
                if (existingInv.status === 'pending') {
                  // Re-send — update the invite timestamp and re-notify
                  invite = await prisma.projectInvite.update({
                    where: { id: existingInv.id },
                    data: { updatedAt: new Date() },
                  });
                  isResend = true;
                } else {
                  // Declined/expired — allow re-invite by resetting status
                  invite = await prisma.projectInvite.update({
                    where: { id: existingInv.id },
                    data: { status: 'pending', declinedAt: null, updatedAt: new Date() },
                  });
                }
              }
            }

            if (!invite) {
              invite = await prisma.projectInvite.create({
                data: {
                  projectId: projId!,
                  inviterId: userId,
                  inviteeId,
                  inviteeEmail,
                  connectionId: connId,
                  role: m.role || 'contributor',
                },
              });
            }

            // On re-send, close previous queue items and comms messages for this invite
            if (isResend && inviteeId) {
              await prisma.queueItem.updateMany({
                where: {
                  userId: inviteeId,
                  type: 'notification',
                  status: { notIn: ['done_today', 'dismissed', 'archived'] },
                  metadata: { contains: invite.id },
                },
                data: { status: 'dismissed' },
              });
              await prisma.commsMessage.updateMany({
                where: {
                  userId: inviteeId,
                  sender: 'system',
                  state: { not: 'archived' },
                  metadata: { contains: invite.id },
                },
                data: { state: 'archived' },
              });
            }

            // Always send notifications — even on re-send
            if (inviteeId) {
              await prisma.queueItem.create({
                data: {
                  type: 'notification',
                  title: `📋 Project invite: ${proj.name}`,
                  description: isResend
                    ? `Reminder: You've been invited to join "${proj.name}" as ${m.role || 'contributor'}.`
                    : `You've been invited to join "${proj.name}" as ${m.role || 'contributor'}.`,
                  priority: 'medium',
                  status: 'ready',
                  source: 'agent',
                  userId: inviteeId,
                  projectId: projId!,
                  metadata: JSON.stringify({ type: 'project_invite', inviteId: invite.id, resend: isResend }),
                },
              });

              await prisma.commsMessage.create({
                data: {
                  sender: 'system',
                  content: isResend
                    ? `📋 Reminder: You've been invited to project "${proj.name}" as ${m.role || 'contributor'}.`
                    : `📋 You've been invited to project "${proj.name}" as ${m.role || 'contributor'}.`,
                  state: 'new',
                  priority: 'medium',
                  userId: inviteeId,
                  metadata: JSON.stringify({ type: 'project_invite', inviteId: invite.id, projectId: projId }),
                },
              });
            }

            logActivity({ userId, action: 'project_invite_sent', summary: `${isResend ? 'Re-sent invite to' : 'Invited'} ${m.name || inviteeEmail || 'user'} to "${proj.name}"`, metadata: { projectId: projId, inviteId: invite.id, resend: isResend } });

            // Federation push
            if (connId) {
              const senderU2 = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
              const { pushNotificationToFederatedInstance: pushNotif2 } = await import('./federation-push');
              pushNotif2(connId, {
                type: 'project_invite',
                fromUserName: senderU2?.name || 'A DiviDen user',
                fromUserEmail: senderU2?.email || '',
                title: `Project invite: ${proj.name}`,
                body: `You've been invited to join "${proj.name}" as ${m.role || 'contributor'}.`,
                metadata: { projectId: projId, inviteId: invite.id, role: m.role || 'contributor' },
              }).catch(() => {});
            }

            invResults.push({ name: m.name || inviteeEmail, status: isResend ? 're-sent' : 'invited', inviteId: invite.id });
          } catch (invErr: any) {
            invResults.push({ name: m.name || m.email, status: 'error', error: invErr.message });
          }
        }

        return { tag: name, success: true, data: { projectId: projId, projectName: proj.name, invites: invResults } };
      }

      default:
        return { tag: name, success: false, error: `Unknown tag: ${name}` };
    }
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