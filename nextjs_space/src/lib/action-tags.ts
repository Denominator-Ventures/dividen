/**
 * DiviDen Action Tag Parser & Executor
 * 
 * Parses [[tag_name:params]] from AI responses and executes
 * corresponding database operations.
 */

import { prisma } from './prisma';

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
  'accept_connection', // accept a pending connection request
  'relay_respond',     // respond to an inbound relay (complete/decline)
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
        const queueItem = await prisma.queueItem.create({
          data: {
            type: params.type || 'task',
            title: params.title || 'Untitled Item',
            description: params.description || null,
            priority: params.priority || 'medium',
            source: 'agent',
          },
        });
        return { tag: name, success: true, data: { id: queueItem.id, title: queueItem.title } };
      }

      // ── Calendar & Reminders ─────────────────────────────────────────
      case 'create_event':
      case 'set_reminder': {
        // Store as queue items with metadata
        const itemType = name === 'create_event' ? 'task' : 'reminder';
        const metadata = JSON.stringify({
          date: params.date,
          time: params.time,
          type: name,
        });
        const item = await prisma.queueItem.create({
          data: {
            type: itemType,
            title: params.title || (name === 'create_event' ? 'New Event' : 'Reminder'),
            description: params.description || null,
            priority: params.priority || 'medium',
            source: 'agent',
            metadata,
          },
        });
        return { tag: name, success: true, data: { id: item.id, title: item.title } };
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
          // Fallback: save as draft in queue
          const emailMeta = JSON.stringify({
            to: params.to,
            subject: params.subject,
            body: params.body,
            identity: sendIdentity,
            type: 'email_draft',
          });
          const item = await prisma.queueItem.create({
            data: {
              type: 'task',
              title: `Email draft: ${params.subject || 'No subject'}`,
              description: `To: ${params.to}\n\n${params.body || ''}`,
              priority: 'medium',
              source: 'agent',
              metadata: emailMeta,
            },
          });
          return { tag: name, success: true, data: { id: item.id, note: `No email integration for ${sendIdentity}. Saved as draft in queue.` } };
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
        // Deactivate existing keys for this provider, then create new
        await prisma.agentApiKey.updateMany({
          where: { provider: keyProvider },
          data: { isActive: false },
        });
        const apiKeyRecord = await prisma.agentApiKey.create({
          data: {
            provider: keyProvider,
            apiKey: params.apiKey,
            label: params.label || `${keyProvider} key`,
            isActive: true,
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

        return { tag: name, success: true, data: { relayId: relay.id, subject, intent, status: 'delivered' } };
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
        // params: { relayId, status ("completed"|"declined"), responsePayload? }
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
        return { tag: name, success: true, data: { relayId: updatedRelay.id, status: params.status } };
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
