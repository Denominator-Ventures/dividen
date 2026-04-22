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
  'dispatch_queue': async (params, userId, name) => {
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
      
  },

  'queue_capability_action': async (params, userId, name) => {
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
      
  },

  'confirm_queue_item': async (params, userId, name) => {
        const qId = params.id;
        if (!qId) return { tag: name, success: false, error: 'Missing queue item id' };
        const qItem = await prisma.queueItem.findFirst({ where: { id: qId, userId } });
        if (!qItem) return { tag: name, success: false, error: 'Queue item not found' };
        if (qItem.status !== 'pending_confirmation') {
          return { tag: name, success: false, error: `Item is already "${qItem.status}", not pending_confirmation` };
        }
        const confirmed = await prisma.queueItem.update({ where: { id: qId }, data: { status: 'ready' } });
        return { tag: name, success: true, data: { id: confirmed.id, title: confirmed.title, status: 'ready' } };
      
  },

  'remove_queue_item': async (params, userId, name) => {
        const rId = params.id;
        if (!rId) return { tag: name, success: false, error: 'Missing queue item id' };
        const rItem = await prisma.queueItem.findFirst({ where: { id: rId, userId } });
        if (!rItem) return { tag: name, success: false, error: 'Queue item not found' };
        await prisma.queueItem.delete({ where: { id: rId } });
        return { tag: name, success: true, data: { id: rId, title: rItem.title, removed: true } };
      
  },

  'edit_queue_item': async (params, userId, name) => {
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
      
  },
};

export default handlers;
