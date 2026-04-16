// ─── Webhook Auto-Action Executor ──────────────────────────────────────────
// Maps webhook payloads to DiviDen actions (create cards, contacts, queue items)
// Supports auto-learned field maps + manual overrides + default sniffing fallback

import { prisma } from '@/lib/prisma';
import { type WebhookFieldMap } from '@/lib/webhook-learn';
import { deduplicatedQueueCreate } from '@/lib/queue-dedup';

export interface WebhookActionResult {
  action: string;
  success: boolean;
  data?: any;
  error?: string;
}

export interface MappingRule {
  field: string;       // Source field path in payload (dot notation)
  action: string;      // Target action: 'create_card' | 'create_contact' | 'create_queue_item'
  mapping: Record<string, string>; // field mapping: target_field -> source_field_path
  conditions?: Record<string, any>; // Optional conditions to check
}

// ─── Payload Utilities ──────────────────────────────────────────────────────

/**
 * Safely extract a nested value from an object using dot notation
 */
export function extractField(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

/**
 * Apply mapping rules to extract values from a payload
 */
function applyMapping(payload: any, mapping: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [targetField, sourcePath] of Object.entries(mapping)) {
    if (sourcePath.startsWith('"') && sourcePath.endsWith('"')) {
      // Literal value
      result[targetField] = sourcePath.slice(1, -1);
    } else {
      result[targetField] = extractField(payload, sourcePath);
    }
  }
  return result;
}

/**
 * Extract fields from a payload using a learned/manual field map.
 * Returns null for any field not in the map.
 */
function extractWithFieldMap(payload: any, fieldMap: WebhookFieldMap): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [targetField, sourcePath] of Object.entries(fieldMap)) {
    result[targetField] = extractField(payload, sourcePath);
  }
  return result;
}

// ─── Calendar Event Processing ──────────────────────────────────────────────

export async function processCalendarEvent(
  payload: any,
  userId: string,
  mappingRules?: MappingRule[],
  fieldMap?: WebhookFieldMap
): Promise<WebhookActionResult[]> {
  const results: WebhookActionResult[] = [];

  try {
    // If legacy custom mapping rules exist, use them
    if (mappingRules && mappingRules.length > 0) {
      return executeCustomMappings(payload, userId, mappingRules);
    }

    let summary: string, description: string, startTime: string, endTime: string, attendees: any[];

    if (fieldMap && Object.keys(fieldMap).length > 0) {
      // Use learned/manual field map — extract via mapped paths, fall back to sniffing
      const mapped = extractWithFieldMap(payload, fieldMap);
      summary = mapped.title || payload.summary || payload.title || payload.subject || 'Calendar Event';
      description = mapped.description || payload.description || payload.body || '';
      startTime = mapped.startTime || payload.start?.dateTime || payload.start || payload.startTime || '';
      endTime = mapped.endTime || payload.end?.dateTime || payload.end || payload.endTime || '';
      attendees = mapped.attendees || payload.attendees || [];
    } else {
      // Default field sniffing
      summary = payload.summary || payload.title || payload.subject || 'Calendar Event';
      description = payload.description || payload.body || '';
      startTime = payload.start?.dateTime || payload.start || payload.startTime || '';
      endTime = payload.end?.dateTime || payload.end || payload.endTime || '';
      attendees = payload.attendees || [];
    }

    // Create a CalendarEvent record
    const parsedStart = startTime ? new Date(startTime) : new Date();
    const parsedEnd = endTime ? new Date(endTime) : null;
    const externalId = payload.id || payload.eventId || payload.iCalUID || null;

    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        title: summary,
        description: description || null,
        startTime: parsedStart,
        endTime: parsedEnd,
        location: payload.location || null,
        attendees: attendees.length > 0 ? JSON.stringify(attendees) : null,
        source: 'webhook',
        externalId,
        metadata: JSON.stringify(payload),
        userId,
      },
    });

    results.push({
      action: 'create_calendar_event',
      success: true,
      data: { id: calendarEvent.id, title: calendarEvent.title },
    });

    // Also create a queue item (with dedup)
    const calDesc = [
      description,
      startTime ? `Start: ${startTime}` : '',
      endTime ? `End: ${endTime}` : '',
      attendees.length > 0
        ? `Attendees: ${attendees.map((a: any) => a.email || a.name || a).join(', ')}`
        : '',
    ].filter(Boolean).join('\n');
    const queueItem = await deduplicatedQueueCreate({
      type: 'task',
      title: `📅 ${summary}`,
      description: calDesc,
      priority: 'medium',
      source: 'webhook',
      userId,
      metadata: JSON.stringify({ webhook_type: 'calendar', original: payload }),
    });

    results.push({
      action: 'create_queue_item',
      success: true,
      data: { id: queueItem.item.id, title: queueItem.item.title, dedupCreated: queueItem.created },
    });

    // If the event has attendees, create contacts for new ones
    if (Array.isArray(attendees) && attendees.length > 0) {
      for (const attendee of attendees) {
        const name = attendee.displayName || attendee.name || attendee.email?.split('@')[0] || 'Unknown';
        const email = attendee.email || null;

        if (email) {
          const existing = await prisma.contact.findFirst({
            where: { userId, email },
          });

          if (!existing) {
            const contact = await prisma.contact.create({
              data: {
                name,
                email,
                source: 'webhook',
                tags: 'calendar',
                userId,
              },
            });
            results.push({
              action: 'create_contact',
              success: true,
              data: { id: contact.id, name: contact.name },
            });
          }
        }
      }
    }
  } catch (err: any) {
    results.push({
      action: 'process_calendar',
      success: false,
      error: err.message,
    });
  }

  return results;
}

// ─── Email Processing ───────────────────────────────────────────────────────

export async function processEmailEvent(
  payload: any,
  userId: string,
  mappingRules?: MappingRule[],
  fieldMap?: WebhookFieldMap
): Promise<WebhookActionResult[]> {
  const results: WebhookActionResult[] = [];

  try {
    if (mappingRules && mappingRules.length > 0) {
      return executeCustomMappings(payload, userId, mappingRules);
    }

    let subject: string, body: string, senderName: string, senderEmail: string | null;

    if (fieldMap && Object.keys(fieldMap).length > 0) {
      const mapped = extractWithFieldMap(payload, fieldMap);
      subject = mapped.subject || payload.subject || payload.title || 'No Subject';
      body = mapped.body || payload.body || payload.text || payload.snippet || '';
      senderName = mapped.fromName || (payload.from || payload.sender || {}).name || 'Unknown';
      senderEmail = mapped.fromEmail || (payload.from || payload.sender || {}).email || (payload.from || payload.sender || {}).address || null;
    } else {
      const from = payload.from || payload.sender || {};
      subject = payload.subject || payload.title || 'No Subject';
      body = payload.body || payload.text || payload.snippet || '';
      senderName = from.name || from.email?.split('@')[0] || 'Unknown';
      senderEmail = from.email || from.address || null;
    }

    // Create or update contact from sender
    if (senderEmail) {
      const existing = await prisma.contact.findFirst({
        where: { userId, email: senderEmail },
      });

      if (!existing) {
        const contact = await prisma.contact.create({
          data: {
            name: senderName,
            email: senderEmail,
            source: 'webhook',
            tags: 'email',
            userId,
          },
        });
        results.push({
          action: 'create_contact',
          success: true,
          data: { id: contact.id, name: contact.name },
        });
      }
    }

    // Create an EmailMessage record
    const toEmail = payload.to?.email || payload.to?.address || payload.to || payload.recipient || null;
    const snippet = (body || '').substring(0, 200);
    const labels = payload.labels || payload.labelIds || null;
    const receivedAt = payload.date || payload.receivedAt || payload.internalDate
      ? new Date(payload.date || payload.receivedAt || payload.internalDate)
      : new Date();

    const emailRecord = await prisma.emailMessage.create({
      data: {
        subject,
        fromName: senderName,
        fromEmail: senderEmail,
        toEmail: typeof toEmail === 'string' ? toEmail : null,
        body: body.substring(0, 10000),
        snippet,
        labels: labels ? (typeof labels === 'string' ? labels : JSON.stringify(labels)) : null,
        isRead: false,
        isStarred: false,
        source: 'webhook',
        metadata: JSON.stringify(payload),
        receivedAt,
        userId,
      },
    });

    results.push({
      action: 'create_email_message',
      success: true,
      data: { id: emailRecord.id, subject: emailRecord.subject },
    });

    // Also create a queue item for the email (with dedup)
    const queueItem = await deduplicatedQueueCreate({
      type: 'notification',
      title: `📧 ${subject}`,
      description: `From: ${senderName} (${senderEmail || 'unknown'})\n${body.substring(0, 500)}`,
      priority: 'medium',
      source: 'webhook',
      userId,
      metadata: JSON.stringify({ webhook_type: 'email', from: senderEmail }),
    });

    results.push({
      action: 'create_queue_item',
      success: true,
      data: { id: queueItem.item.id, title: queueItem.item.title, dedupCreated: queueItem.created },
    });
  } catch (err: any) {
    results.push({
      action: 'process_email',
      success: false,
      error: err.message,
    });
  }

  return results;
}

// ─── Transcript Processing ──────────────────────────────────────────────────

export async function processTranscriptEvent(
  payload: any,
  userId: string,
  mappingRules?: MappingRule[],
  fieldMap?: WebhookFieldMap
): Promise<WebhookActionResult[]> {
  const results: WebhookActionResult[] = [];

  try {
    if (mappingRules && mappingRules.length > 0) {
      return executeCustomMappings(payload, userId, mappingRules);
    }

    let title: string, transcript: string, actionItems: any[], participants: any[];

    if (fieldMap && Object.keys(fieldMap).length > 0) {
      const mapped = extractWithFieldMap(payload, fieldMap);
      title = mapped.title || payload.title || payload.meetingTitle || 'Meeting Transcript';
      transcript = mapped.transcript || payload.transcript || payload.text || payload.content || '';
      actionItems = mapped.actionItems || payload.actionItems || payload.action_items || [];
      participants = mapped.participants || payload.participants || payload.attendees || [];
    } else {
      title = payload.title || payload.meetingTitle || 'Meeting Transcript';
      transcript = payload.transcript || payload.text || payload.content || '';
      actionItems = payload.actionItems || payload.action_items || [];
      participants = payload.participants || payload.attendees || [];
    }

    // Create a kanban card for the meeting
    const card = await prisma.kanbanCard.create({
      data: {
        title: `📝 ${title}`,
        description: transcript.substring(0, 2000),
        status: 'leads',
        priority: 'medium',
        assignee: 'human',
        order: 0,
        userId,
      },
    });

    results.push({
      action: 'create_card',
      success: true,
      data: { id: card.id, title: card.title },
    });

    // Create checklist items for action items
    if (Array.isArray(actionItems) && actionItems.length > 0) {
      for (let i = 0; i < actionItems.length; i++) {
        const itemText = typeof actionItems[i] === 'string'
          ? actionItems[i]
          : actionItems[i].text || actionItems[i].description || String(actionItems[i]);

        await prisma.checklistItem.create({
          data: {
            text: itemText,
            order: i,
            cardId: card.id,
          },
        });
      }

      results.push({
        action: 'create_checklist_items',
        success: true,
        data: { count: actionItems.length, cardId: card.id },
      });
    }

    // Create contacts for participants
    if (Array.isArray(participants) && participants.length > 0) {
      for (const p of participants) {
        const name = p.name || p.displayName || p.email?.split('@')[0] || 'Unknown';
        const email = p.email || null;

        if (email) {
          const existing = await prisma.contact.findFirst({
            where: { userId, email },
          });

          if (!existing) {
            const contact = await prisma.contact.create({
              data: {
                name,
                email,
                source: 'webhook',
                tags: 'meeting',
                userId,
              },
            });
            results.push({
              action: 'create_contact',
              success: true,
              data: { id: contact.id, name: contact.name },
            });
          }
        }
      }
    }
  } catch (err: any) {
    results.push({
      action: 'process_transcript',
      success: false,
      error: err.message,
    });
  }

  return results;
}

// ─── Generic Payload Processing ─────────────────────────────────────────────

export async function processGenericEvent(
  payload: any,
  userId: string,
  mappingRules?: MappingRule[],
  fieldMap?: WebhookFieldMap
): Promise<WebhookActionResult[]> {
  const results: WebhookActionResult[] = [];

  try {
    if (mappingRules && mappingRules.length > 0) {
      return executeCustomMappings(payload, userId, mappingRules);
    }

    let title: string, description: string;

    if (fieldMap && Object.keys(fieldMap).length > 0) {
      const mapped = extractWithFieldMap(payload, fieldMap);
      title = mapped.title || payload.title || payload.subject || payload.name || payload.event || 'Webhook Event';
      description = mapped.description || payload.description || payload.body || payload.message || JSON.stringify(payload, null, 2).substring(0, 500);
    } else {
      title = payload.title || payload.subject || payload.name || payload.event || 'Webhook Event';
      description = payload.description || payload.body || payload.message || JSON.stringify(payload, null, 2).substring(0, 500);
    }

    const queueItem = await deduplicatedQueueCreate({
      type: 'notification',
      title: `🔗 ${title}`,
      description,
      priority: 'medium',
      source: 'webhook',
      userId,
      metadata: JSON.stringify({ webhook_type: 'generic', original: payload }),
    });

    results.push({
      action: 'create_queue_item',
      success: true,
      data: { id: queueItem.item.id, title: queueItem.item.title, dedupCreated: queueItem.created },
    });
  } catch (err: any) {
    results.push({
      action: 'process_generic',
      success: false,
      error: err.message,
    });
  }

  return results;
}

// ─── Custom Mapping Executor ────────────────────────────────────────────────

async function executeCustomMappings(
  payload: any,
  userId: string,
  rules: MappingRule[]
): Promise<WebhookActionResult[]> {
  const results: WebhookActionResult[] = [];

  for (const rule of rules) {
    try {
      // Check conditions if any
      if (rule.conditions) {
        let conditionsMet = true;
        for (const [field, expected] of Object.entries(rule.conditions)) {
          const actual = extractField(payload, field);
          if (actual !== expected) {
            conditionsMet = false;
            break;
          }
        }
        if (!conditionsMet) continue;
      }

      const mapped = applyMapping(payload, rule.mapping);

      switch (rule.action) {
        case 'create_card': {
          const card = await prisma.kanbanCard.create({
            data: {
              title: mapped.title || 'Webhook Card',
              description: mapped.description || null,
              status: mapped.status || 'leads',
              priority: mapped.priority || 'medium',
              assignee: mapped.assignee || 'human',
              order: 0,
              userId,
            },
          });
          results.push({ action: 'create_card', success: true, data: { id: card.id } });
          break;
        }

        case 'create_contact': {
          const contact = await prisma.contact.create({
            data: {
              name: mapped.name || 'Unknown',
              email: mapped.email || null,
              phone: mapped.phone || null,
              company: mapped.company || null,
              role: mapped.role || null,
              source: 'webhook',
              tags: mapped.tags || null,
              userId,
            },
          });
          results.push({ action: 'create_contact', success: true, data: { id: contact.id } });
          break;
        }

        case 'create_queue_item': {
          const item = await deduplicatedQueueCreate({
            type: mapped.type || 'task',
            title: mapped.title || 'Webhook Task',
            description: mapped.description || null,
            priority: mapped.priority || 'medium',
            source: 'webhook',
            userId,
            metadata: mapped.metadata || null,
          });
          results.push({ action: 'create_queue_item', success: true, data: { id: item.item.id, dedupCreated: item.created } });
          break;
        }

        default:
          results.push({ action: rule.action, success: false, error: `Unknown action: ${rule.action}` });
      }
    } catch (err: any) {
      results.push({ action: rule.action, success: false, error: err.message });
    }
  }

  return results;
}
