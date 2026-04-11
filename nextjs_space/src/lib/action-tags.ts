/**
 * DiviDen Action Tag Parser & Executor
 * 
 * Parses [[tag_name:params]] from AI responses and executes
 * corresponding database operations.
 */

import { prisma } from './prisma';
import { deduplicatedQueueCreate } from './queue-dedup';
import { pushRelayStateChanged } from './webhook-push';

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
  'find_jobs',         // find matching jobs for this user's profile
  // ── Entity Resolution (FVP Brief #5) ──
  'entity_resolve',    // cross-surface entity resolution: find all info about a person/company
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
async function executeTag(
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
        return { tag: name, success: true, data: { id: card.id, title: card.title } };
      }

      case 'archive_card': {
        if (!params.id) return { tag: name, success: false, error: 'Missing card id' };
        const card = await prisma.kanbanCard.update({
          where: { id: params.id },
          data: { status: 'completed' },
        });
        return { tag: name, success: true, data: { id: card.id } };
      }

      // ── Checklist ────────────────────────────────────────────────────
      case 'add_checklist': {
        if (!params.cardId || !params.text) {
          return { tag: name, success: false, error: 'Missing cardId or text' };
        }
        const item = await prisma.checklistItem.create({
          data: {
            cardId: params.cardId,
            text: params.text,
            order: params.order || 0,
          },
        });
        return { tag: name, success: true, data: { id: item.id, text: item.text } };
      }

      case 'complete_checklist': {
        if (!params.id) return { tag: name, success: false, error: 'Missing checklist item id' };
        const item = await prisma.checklistItem.update({
          where: { id: params.id },
          data: { completed: params.completed !== false },
        });
        return { tag: name, success: true, data: { id: item.id, completed: item.completed } };
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
            const link = await prisma.cardContact.create({
              data: {
                cardId: params.cardId,
                contactId: contact.id,
                role: params.role || null,
              },
            });
            return { tag: name, success: true, data: { id: link.id, contactId: contact.id } };
          }
          return { tag: name, success: false, error: 'Missing cardId or contactId/contactName' };
        }
        try {
          const link = await prisma.cardContact.create({
            data: {
              cardId: params.cardId,
              contactId: params.contactId,
              role: params.role || null,
            },
          });
          return { tag: name, success: true, data: { id: link.id } };
        } catch {
          return { tag: name, success: false, error: 'Link already exists or invalid IDs' };
        }
      }

      // ── Queue ────────────────────────────────────────────────────────
      case 'dispatch_queue': {
        const dedupResult = await deduplicatedQueueCreate({
          type: params.type || 'task',
          title: params.title || 'Untitled Item',
          description: params.description || null,
          priority: params.priority || 'medium',
          source: 'agent',
          userId,
        });
        return {
          tag: name,
          success: true,
          data: {
            id: dedupResult.item.id,
            title: dedupResult.item.title,
            deduplicated: !dedupResult.created,
            ...(dedupResult.reason ? { reason: dedupResult.reason } : {}),
          },
        };
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

        // Find the connection — by nickname, email, or ID
        let connection: any = null;
        if (params.connectionId) {
          connection = await prisma.connection.findUnique({ where: { id: params.connectionId } });
        } else if (params.connectionNickname || params.to || params.name) {
          const search = (params.connectionNickname || params.to || params.name).toLowerCase();
          const allConns = await prisma.connection.findMany({
            where: {
              OR: [{ requesterId: userId }, { accepterId: userId }],
              status: 'active',
            },
            include: {
              requester: { select: { id: true, name: true, email: true } },
              accepter: { select: { id: true, name: true, email: true } },
            },
          });
          connection = allConns.find(c => {
            const nick = (c.nickname || '').toLowerCase();
            const peerNick = (c.peerNickname || '').toLowerCase();
            const peerName = (c.peerUserName || '').toLowerCase();
            const reqName = (c.requester?.name || '').toLowerCase();
            const accName = (c.accepter?.name || '').toLowerCase();
            const reqEmail = (c.requester?.email || '').toLowerCase();
            const accEmail = (c.accepter?.email || '').toLowerCase();
            return [nick, peerNick, peerName, reqName, accName, reqEmail, accEmail].some(v => v.includes(search));
          });
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
          scopedConnIds = new Set(projMembers.map(m => m.connectionId).filter(Boolean) as string[]);
        } else if (params.teamId) {
          const tmMembers = await prisma.teamMember.findMany({
            where: { teamId: params.teamId },
            select: { connectionId: true },
          });
          scopedConnIds = new Set(tmMembers.map(m => m.connectionId).filter(Boolean) as string[]);
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
        const peerUserIds = allActiveConns.map(c => c.requesterId === userId ? c.accepterId : c.requesterId).filter(Boolean) as string[];
        const peerProfiles = await prisma.userProfile.findMany({
          where: { userId: { in: peerUserIds } },
          select: { userId: true, relayMode: true, allowBroadcasts: true },
        });
        const profileMap = new Map(peerProfiles.map(p => [p.userId, p]));

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

          // Notify local users
          if (!conn.isFederated && toId) {
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
        // params: { to (name/email), question, context?, topic? }
        // Creates a LOW-PRIORITY relay that the receiving agent should weave naturally into conversation
        // rather than interrupting with a notification
        const ambientQuestion = params.question || params.subject || params.message || '';
        if (!ambientQuestion) {
          return { tag: name, success: false, error: 'Missing question for ambient relay' };
        }

        const searchTerm = (params.to || params.name || params.connectionNickname || '').toLowerCase();
        if (!searchTerm) {
          return { tag: name, success: false, error: 'Must specify who to ask (to/name)' };
        }

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

        const ambientConn = ambientConns.find(c => {
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
            intent: 'ask',
            subject: ambientQuestion,
            payload: JSON.stringify({
              _ambient: true,
              _context: params.context || null,
              _topic: params.topic || null,
              _instruction: 'This is an ambient relay. Do NOT interrupt the user. Instead, naturally weave this question into your next conversation when contextually relevant. Respond when you have a natural answer.',
            }),
            status: 'pending',
            priority: 'low',
            peerInstanceUrl: ambientConn.isFederated ? ambientConn.peerInstanceUrl : null,
            ...(params.teamId ? { teamId: params.teamId } : {}),
            ...(params.projectId ? { projectId: params.projectId } : {}),
          },
        });

        // For local users, deliver but mark as ambient (no urgent notification)
        if (!ambientConn.isFederated && ambientToId) {
          await prisma.agentRelay.update({ where: { id: ambientRelay.id }, data: { status: 'delivered' } });
          // No comms notification for ambient relays — the receiving agent picks it up silently
        }

        await prisma.activityLog.create({
          data: {
            action: 'relay_ambient',
            actor: 'divi',
            summary: `Divi sent ambient ask to ${searchTerm}: "${ambientQuestion.slice(0, 60)}..."`,
            metadata: JSON.stringify({ relayId: ambientRelay.id }),
            userId,
          },
        }).catch(() => {});

        return {
          tag: name,
          success: true,
          data: {
            relayId: ambientRelay.id,
            to: searchTerm,
            question: ambientQuestion,
            mode: 'ambient',
            note: 'Sent as ambient relay — their agent will work this into conversation naturally.',
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
        if (!params.relayId || !params.status) {
          return { tag: name, success: false, error: 'relayId and status are required.' };
        }
        const relayToRespond = await prisma.agentRelay.findUnique({ where: { id: params.relayId } });
        if (!relayToRespond) {
          return { tag: name, success: false, error: 'Relay not found.' };
        }
        const updatedRelay = await prisma.agentRelay.update({
          where: { id: params.relayId },
          data: {
            status: params.status,
            resolvedAt: new Date(),
            responsePayload: params.responsePayload ? (typeof params.responsePayload === 'string' ? params.responsePayload : JSON.stringify(params.responsePayload)) : null,
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
              relayId: params.relayId,
              fromUserId: relayToRespond.fromUserId,
              toUserId: userId,
              relayCreatedAt: relayToRespond.createdAt,
              outcome: params.status === 'completed' ? 'answered' : 'declined',
              responseQuality: params._ambientQuality || (
                params.responsePayload && (typeof params.responsePayload === 'string' ? params.responsePayload : JSON.stringify(params.responsePayload)).length > 50
                  ? 'substantive' : params.responsePayload ? 'brief' : null
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
          const statusLabel = params.status === 'completed' ? '✅ completed' : '❌ declined';
          await prisma.commsMessage.create({
            data: {
              sender: 'divi',
              content: `📡 Divi ${statusLabel} the relay: "${relayToRespond.subject}"`,
              state: 'new',
              priority: relayToRespond.priority || 'normal',
              userId: relayToRespond.fromUserId,
              metadata: JSON.stringify({ type: 'relay_response', relayId: params.relayId }),
            },
          });
        }
        // Push relay state webhook
        pushRelayStateChanged(relayToRespond.fromUserId, {
          relayId: params.relayId,
          threadId: relayToRespond.threadId,
          previousState: relayToRespond.status,
          newState: params.status,
          subject: relayToRespond.subject,
        });

        return { tag: name, success: true, data: { relayId: updatedRelay.id, status: params.status, ambientSignalCaptured: isAmbient } };
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

        const { cardId, tasks, routeType: preferredRoute, teamId: routeTeamId, projectId: routeProjectId } = params;
        if (!cardId || !tasks || !Array.isArray(tasks)) {
          return { tag: name, success: false, error: 'task_route requires cardId and tasks array' };
        }

        // Assemble the card context
        const context = await assembleCardContext(cardId, userId);
        if (!context) {
          return { tag: name, success: false, error: 'Card not found or not owned by user' };
        }

        const results: any[] = [];

        for (const task of tasks) {
          const { title, description, requiredSkills = [], requiredTaskTypes = [], intent = 'assign_task', priority = 'normal', to, route } = task;

          // Find skill matches — scope to team/project when provided
          const matches = await findSkillMatches(userId, requiredSkills, requiredTaskTypes, { teamId: routeTeamId, projectId: routeProjectId });
          const routeMode = route || preferredRoute || 'direct';

          // Generate brief markdown
          const briefMd = generateBriefMarkdown(context, [{ title, description, requiredSkills, intent, priority }], matches);

          // Determine target
          let targetMatch = matches[0] || null;
          if (to) {
            // If explicit target specified, find them in matches or connections
            const explicit = matches.find(m =>
              (m.userName && m.userName.toLowerCase().includes(to.toLowerCase())) ||
              m.userEmail.toLowerCase().includes(to.toLowerCase())
            );
            if (explicit) targetMatch = explicit;
          }

          // Store the brief
          const brief = await storeBrief({
            userId,
            type: 'task_decomposition',
            title: `Task: ${title}`,
            sourceCardId: cardId,
            sourceContactIds: context.linkedContacts.map(c => c.id),
            briefMarkdown: briefMd,
            promptUsed: description,
            matchedUserId: targetMatch?.userId || undefined,
            matchReasoning: targetMatch?.reasoning || 'No matching connections found',
            matchedSkills: targetMatch ? [...targetMatch.matchedSkills, ...targetMatch.matchedTaskTypes] : undefined,
            routeType: routeMode,
            resultAction: targetMatch ? 'relay_sent' : 'suggestion_made',
            status: targetMatch ? 'routed' : 'assembled',
          });

          // Create the relay if we have a target
          if (targetMatch && routeMode !== 'self') {
            const relayPayload: any = {
              _briefId: brief.id,
              task: { title, description, requiredSkills, intent, priority },
              cardContext: { id: context.card.id, title: context.card.title, status: context.card.status },
            };
            if (routeMode === 'ambient') relayPayload._ambient = true;

            const relay = await prisma.agentRelay.create({
              data: {
                connectionId: targetMatch.connectionId,
                fromUserId: userId,
                toUserId: targetMatch.userId,
                direction: 'outbound',
                type: 'request',
                intent,
                subject: title,
                payload: JSON.stringify(relayPayload),
                status: 'pending',
                priority,
              },
            });

            // Update brief with relay ID
            await prisma.agentBrief.update({
              where: { id: brief.id },
              data: { resultRelayId: relay.id },
            });

            // Log activity
            await prisma.activityLog.create({
              data: {
                action: 'task_routed',
                actor: 'divi',
                summary: `Routed task "${title}" to ${targetMatch.userName || targetMatch.userEmail} via ${routeMode} relay`,
                metadata: JSON.stringify({ briefId: brief.id, relayId: relay.id, cardId, matchScore: targetMatch.score }),
                userId,
              },
            });

            results.push({
              task: title,
              routedTo: targetMatch.userName || targetMatch.userEmail,
              routeType: routeMode,
              matchScore: targetMatch.score,
              reasoning: targetMatch.reasoning,
              briefId: brief.id,
              relayId: relay.id,
            });
          } else {
            // No match — log as suggestion
            await prisma.activityLog.create({
              data: {
                action: 'task_decomposed',
                actor: 'divi',
                summary: `Decomposed task "${title}" from card "${context.card.title}" — no matching connection found`,
                metadata: JSON.stringify({ briefId: brief.id, cardId, availableMatches: matches.length }),
                userId,
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
        const { title: jobTitle, description: jobDesc, taskType, urgency, compensation, requiredSkills, estimatedHours } = params;
        if (!jobTitle) return { tag: name, success: false, error: 'post_job requires title' };

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
          },
        });
        return { tag: name, success: true, data: { jobId: newJob.id, title: newJob.title, status: newJob.status, message: 'Job posted to the network job board' } };
      }

      case 'find_jobs': {
        const { findMatchingJobsForUser } = await import('@/lib/job-matcher');
        const jobMatches = await findMatchingJobsForUser(userId, 5);
        if (jobMatches.length === 0) {
          return { tag: name, success: true, data: { matches: [], message: 'No matching jobs found on the network right now. Check back later or update your profile skills.' } };
        }
        // Fetch job details for the matches
        const matchedJobs = await prisma.networkJob.findMany({
          where: { id: { in: jobMatches.map(m => m.jobId) } },
          select: { id: true, title: true, description: true, taskType: true, urgency: true, compensation: true, estimatedHours: true },
        });
        const results = jobMatches.map(m => {
          const job = matchedJobs.find(j => j.id === m.jobId);
          return { ...m, job };
        });
        return { tag: name, success: true, data: { matches: results, message: `Found ${results.length} matching jobs on the network` } };
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
