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
  'post_job': async (params, userId, name) => {
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
      
  },

  'propose_task': async (params, userId, name) => {
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
      
  },

  'find_jobs': async (params, userId, name) => {
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
      
  },

  'complete_job': async (params, userId, name) => {
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
      
  },

  'review_job': async (params, userId, name) => {
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
      
  },

  'list_marketplace': async (params, userId, name) => {
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
      
  },

  'execute_agent': async (params, userId, name) => {
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
      
  },

  'subscribe_agent': async (params, userId, name) => {
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
      
  },

  'install_agent': async (params, userId, name) => {
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
      
  },

  'uninstall_agent': async (params, userId, name) => {
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
      
  },

  'suggest_marketplace': async (params, userId, name) => {
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
      
  },

  'route_task': async (params, userId, name) => {
        if (!params.taskDescription) {
          return { tag: name, success: false, error: 'taskDescription is required' };
        }
        try {
          const { intelligentTaskRoute } = await import('../brief-assembly');
          const result = await intelligentTaskRoute(userId, {
            description: params.taskDescription,
            skills: params.taskSkills || [],
            taskType: params.taskType || 'custom',
          });
          return { tag: name, success: true, data: result };
        } catch (e: any) {
          return { tag: name, success: false, error: e.message || 'Task routing not available' };
        }
      
  },
};

export default handlers;
