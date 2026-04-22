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
  'task_route': async (params, userId, name) => {
        const { assembleCardContext, findSkillMatches, generateBriefMarkdown, storeBrief } = await import('../brief-assembly');

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
                // v2.3.2 — top-level scope on the queue item so dashboards and sequential dispatch can filter by project/team
                teamId: routeTeamId || undefined,
                projectId: routeProjectId || undefined,
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
                  // v2.3.2 — scope echoed into meta so executeTaskRouteDispatch can read it in one place
                  teamId: routeTeamId || null,
                  projectId: routeProjectId || null,
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
      
  },

  'assemble_brief': async (params, userId, name) => {
        const { assembleCardContext, findSkillMatches, generateBriefMarkdown, storeBrief } = await import('../brief-assembly');

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
      
  },

  'project_dashboard': async (params, userId, name) => {
        const { assembleProjectContext, generateProjectDashboardMarkdown } = await import('../brief-assembly');

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
      
  },

  'entity_resolve': async (params, userId, name) => {
        // params: { query, surfaces? }
        if (!params.query) {
          return { tag: name, success: false, error: 'query is required (email, name, or domain)' };
        }
        const { resolveEntity } = await import('../entity-resolution');
        const resolution = await resolveEntity(userId, params.query, {
          surfaces: params.surfaces,
          limit: 30,
        });
        return { tag: name, success: true, data: resolution };
      
  },

  'serendipity_matches': async (params, userId, name) => {
        try {
          const { computeSerendipityMatches } = await import('../entity-resolution');
          const matches = await computeSerendipityMatches(userId);
          return { tag: name, success: true, data: matches };
        } catch (e: any) {
          return { tag: name, success: false, error: e.message || 'Serendipity matching not available' };
        }
      
  },

  'network_briefing': async (params, userId, name) => {
        try {
          const { generateNetworkBriefing } = await import('../brief-assembly');
          const briefing = await generateNetworkBriefing(userId);
          return { tag: name, success: true, data: briefing };
        } catch (e: any) {
          return { tag: name, success: false, error: e.message || 'Network briefing not available' };
        }
      
  },
};

export default handlers;
