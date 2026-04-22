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
  'create_card': async (params, userId, name) => {
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
        const { autoLinkFromRelay } = await import('../card-links');
        await autoLinkFromRelay(card.id, userId, {
          linkedFromCardId: params.linkedFromCardId,
          relayId: params.relayId,
          linkType: params.linkType,
        });
        return { tag: name, success: true, data: { id: card.id, title: card.title } };
      
  },

  'update_card': async (params, userId, name) => {
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
          const { propagateCardStatusChange } = await import('../card-links');
          await propagateCardStatusChange(card.id, params.status, params.priority);
        }
        return { tag: name, success: true, data: { id: card.id, title: card.title } };
      
  },

  'archive_card': async (params, userId, name) => {
        if (!params.id) return { tag: name, success: false, error: 'Missing card id' };
        const card = await prisma.kanbanCard.update({
          where: { id: params.id },
          data: { status: 'completed' },
        });
        // v2: Propagate completion to linked cards
        const { propagateCardStatusChange: propagateArchive } = await import('../card-links');
        await propagateArchive(card.id, 'completed');
        return { tag: name, success: true, data: { id: card.id } };
      
  },

  'upsert_card': async (params, userId, name) => {
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
        const { similarity: simFn } = await import('../queue-dedup');
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
        const { autoLinkFromRelay: autoLinkUpsert } = await import('../card-links');
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
      
  },

  'link_artifact': async (params, userId, name) => {
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
      
  },

  'add_checklist': async (params, userId, name) => {
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
      
  },

  'complete_checklist': async (params, userId, name) => {
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
      
  },

  'merge_cards': async (params, userId, name) => {
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
      
  },

  'link_cards': async (params, userId, name) => {
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
        const { linkCards: linkCardsFn } = await import('../card-links');
        const link = await linkCardsFn(fromCardId, toCardId, { linkType: linkType || 'collaboration' });
        return { tag: name, success: !!link, data: link ? { linkId: link.id, from: fromCard.title, to: toCard.title } : undefined };
      
  },
};

export default handlers;
