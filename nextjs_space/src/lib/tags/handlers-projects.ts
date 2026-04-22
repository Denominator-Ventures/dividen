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
  'create_project': async (params, userId, name) => {
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
              const { pushNotificationToFederatedInstance } = await import('../federation-push');
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
      
  },

  'invite_to_project': async (params, userId, name) => {
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
              const { pushNotificationToFederatedInstance: pushNotif2 } = await import('../federation-push');
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
      
  },

  'assign_team_to_project': async (params, userId, name) => {
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
      
  },

  'create_goal': async (params, userId, name) => {
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
      
  },

  'update_goal': async (params, userId, name) => {
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
      
  },

  'accept_invite': async (params, userId, name) => {
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
      
  },

  'decline_invite': async (params, userId, name) => {
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
      
  },

  'list_invites': async (params, userId, name) => {
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
      
  },
};

export default handlers;
