/* AUTO-EMITTED by extract_tags.ts — Phase 2.1 registry split */
import { prisma } from '../prisma';
import { deduplicatedQueueCreate } from '../queue-dedup';
import { pushRelayStateChanged } from '../webhook-push';
import { getPlatformFeePercent } from '../marketplace-config';
import { checkQueueGate, searchMarketplaceSuggestions } from '../queue-gate';
import { optimizeTaskForAgent } from '../smart-task-prompter';
import { checkAndAutoCompleteCard } from '../card-auto-complete';
import { logActivity } from '../activity';
import type { TagHandlerMap } from './_types';

export const handlers: TagHandlerMap = {
  'create_contact': async (params, userId, name) => {
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
      
  },

  'link_contact': async (params, userId, name) => {
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
      
  },

  'add_relationship': async (params, userId, name) => {
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
      
  },

  'update_contact': async (params, userId, name) => {
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
      
  },

  'link_recording': async (params, userId, name) => {
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
      
  },

  'add_known_person': async (params, userId, name) => {
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
      
  },
};

export default handlers;
