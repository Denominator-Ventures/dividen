export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

/**
 * POST /api/projects/[id]/invite — Invite a user to a project
 * Body: { userId?, email?, connectionId?, role?, message? }
 * No recruiting fee — this is for connected users/team members.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const inviterId = (session.user as any).id;

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { members: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Only project lead or creator can invite
  const isLeadOrCreator = project.createdById === inviterId ||
    project.members.some((m: any) => m.userId === inviterId && m.role === 'lead');
  if (!isLeadOrCreator) return NextResponse.json({ error: 'Only project leads can invite members' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId: inviteeUserId, email, connectionId, role, message, force } = body;

  // Resolve invitee
  let inviteeId = inviteeUserId || null;
  let inviteeEmail = email || null;

  if (!inviteeId && inviteeEmail) {
    const user = await prisma.user.findUnique({ where: { email: inviteeEmail } });
    if (user) inviteeId = user.id;
  }

  if (!inviteeId && !connectionId) {
    return NextResponse.json({ error: 'Must provide userId, email, or connectionId' }, { status: 400 });
  }

  // Check if already a member
  if (inviteeId) {
    const existing = project.members.find((m: any) => m.userId === inviteeId);
    if (existing) return NextResponse.json({ error: 'User is already a project contributor' }, { status: 409 });
  }

  // Check if already invited (pending)
  //   - If NOT force: block with 409 (tell UI to prompt "Resend invite?")
  //   - If force: delete the old invite + its queue item, then create a fresh one.
  let replacedInviteId: string | null = null;
  if (inviteeId) {
    const existingInvite = await prisma.projectInvite.findUnique({
      where: { projectId_inviteeId: { projectId: params.id, inviteeId } },
    });
    if (existingInvite && existingInvite.status === 'pending') {
      if (!force) {
        return NextResponse.json({
          error: 'Invite already pending for this user',
          code: 'ALREADY_INVITED',
          inviteId: existingInvite.id,
        }, { status: 409 });
      }
      // force-reinvite: wipe the old invite + any queue item so we don't duplicate
      replacedInviteId = existingInvite.id;
      try {
        await prisma.queueItem.deleteMany({
          where: {
            userId: inviteeId,
            projectId: params.id,
            metadata: { contains: `"inviteId":"${existingInvite.id}"` },
          },
        });
      } catch { /* non-fatal */ }
      await prisma.projectInvite.delete({ where: { id: existingInvite.id } });
    }
  }
  // Same guardrail for email-only invites (not yet on DiviDen)
  if (!inviteeId && inviteeEmail) {
    const existingByEmail = await prisma.projectInvite.findFirst({
      where: { projectId: params.id, inviteeEmail, status: 'pending' },
    });
    if (existingByEmail) {
      if (!force) {
        return NextResponse.json({
          error: 'Invite already pending for this email',
          code: 'ALREADY_INVITED',
          inviteId: existingByEmail.id,
        }, { status: 409 });
      }
      replacedInviteId = existingByEmail.id;
      await prisma.projectInvite.delete({ where: { id: existingByEmail.id } });
    }
  }

  // Check invitee preferences — respect acceptProjectInvites
  if (inviteeId) {
    const profile = await prisma.userProfile.findUnique({ where: { userId: inviteeId } });
    if (profile && !profile.acceptProjectInvites) {
      return NextResponse.json({ error: 'This user is not accepting project invites' }, { status: 403 });
    }
  }

  // Check if this project is job-linked
  const linkedJob = await prisma.networkJob.findFirst({ where: { projectId: params.id } });

  const invite = await prisma.projectInvite.create({
    data: {
      projectId: params.id,
      inviterId,
      inviteeId,
      inviteeEmail,
      connectionId: connectionId || null,
      role: role || 'contributor',
      message: message || null,
      jobId: linkedJob?.id || null,
    },
  });

  // Activity log for inviter
  logActivity({
    userId: inviterId,
    action: 'project_invite_sent',
    summary: `Invited ${inviteeEmail || 'a connection'} to project "${project.name}"`,
    actor: 'user',
    metadata: { projectId: params.id, inviteId: invite.id, inviteeId, connectionId },
  });

  // Notification for invitee — activity log + queue item + comms relay
  if (inviteeId) {
    logActivity({
      userId: inviteeId,
      action: 'project_invite_received',
      summary: `${(session.user as any).name || (session.user as any).email} invited you to project "${project.name}"`,
      actor: 'system',
      metadata: { projectId: params.id, inviteId: invite.id, inviterId },
    });

    // Queue item so they see it in their task list
    await prisma.queueItem.create({
      data: {
        type: 'notification',
        title: `📋 Project invite: ${project.name}`,
        description: `${(session.user as any).name || 'Someone'} invited you to join "${project.name}" as ${role || 'contributor'}.${message ? ` "${message}"` : ''}`,
        priority: 'medium',
        status: 'ready',
        source: 'system',
        userId: inviteeId,
        projectId: params.id,
        metadata: JSON.stringify({ type: 'project_invite', inviteId: invite.id }),
      },
    });
  }

  // ── Comms relay — surface the invite as a Divi→Divi event on both sides ──
  // Find a connection between inviter and invitee so we can log the relay.
  let relayConnectionId = connectionId || null;
  if (!relayConnectionId && inviteeId) {
    const conn = await prisma.connection.findFirst({
      where: {
        status: 'active',
        OR: [
          { requesterId: inviterId, accepterId: inviteeId },
          { requesterId: inviteeId, accepterId: inviterId },
        ],
      },
      select: { id: true },
    });
    if (conn) relayConnectionId = conn.id;
  }

  let relayCreated: { id: string } | null = null;
  if (relayConnectionId) {
    try {
      // v2.3.2 — Resolve whether this connection is federated so we can push the
      // invite across the wire (including project scope).
      const relayConn = await prisma.connection.findUnique({
        where: { id: relayConnectionId },
        select: { id: true, isFederated: true, peerInstanceUrl: true, peerUserEmail: true },
      });

      const senderName = (session.user as any).name || (session.user as any).email || 'Someone';
      const senderEmail = (session.user as any).email || '';
      const relaySubject = `Project invite: ${project.name}`;
      const relayPayload = {
        kind: 'project_invite',
        inviteId: invite.id,
        projectId: params.id,
        projectName: project.name,
        role: role || 'contributor',
        message: message || null,
        inviterName: senderName,
      };
      const relay = await prisma.agentRelay.create({
        data: {
          connectionId: relayConnectionId,
          fromUserId: inviterId,
          // Federated: no local toUserId (remote user has no local row)
          toUserId: relayConn?.isFederated ? null : (inviteeId || null),
          direction: 'outbound',
          type: 'request',
          intent: 'introduce',
          subject: relaySubject,
          payload: JSON.stringify(relayPayload),
          // Local invitees: delivered immediately; federated: pending until peer acks
          status: relayConn?.isFederated ? 'pending' : (inviteeId ? 'delivered' : 'pending'),
          priority: 'normal',
          projectId: params.id,
          peerInstanceUrl: relayConn?.isFederated ? relayConn.peerInstanceUrl : null,
        },
      });
      relayCreated = { id: relay.id };

      // Also create a comms message for the LOCAL invitee so their CommsTab/inbox lights up.
      if (inviteeId && !relayConn?.isFederated) {
        await prisma.commsMessage.create({
          data: {
            sender: 'divi',
            content: `📡 ${senderName}'s Divi requested you join project "${project.name}" as ${role || 'contributor'}.${message ? ` — "${message}"` : ''}`,
            state: 'new',
            priority: 'normal',
            userId: inviteeId,
            metadata: JSON.stringify({ type: 'project_invite', inviteId: invite.id, relayId: relay.id, projectId: params.id }),
          },
        });
      }

      // ── v2.3.2: Federation push — ship the invite across the wire ──
      if (relayConn?.isFederated) {
        const { pushRelayToFederatedInstance, pushNotificationToFederatedInstance } = await import('@/lib/federation-push');

        // Push the relay (structured introduce) so the peer creates its mirror AgentRelay.
        pushRelayToFederatedInstance(relayConn.id, {
          relayId: relay.id,
          fromUserEmail: senderEmail,
          fromUserName: senderName,
          fromUserId: inviterId,
          toUserEmail: inviteeEmail || relayConn.peerUserEmail || '',
          type: 'request',
          intent: 'introduce',
          subject: relaySubject,
          payload: relayPayload,
          priority: 'normal',
          // v2.3.2 — multi-tenant routing on the wire
          projectId: params.id,
        }).catch(() => {});

        // Also fire a notification so the peer's CommsTab surfaces immediately (parallel to relay).
        pushNotificationToFederatedInstance(relayConn.id, {
          type: 'project_invite',
          fromUserName: senderName,
          fromUserEmail: senderEmail,
          title: relaySubject,
          body: `${senderName} invited you to project "${project.name}" as ${role || 'contributor'}.${message ? ` — "${message}"` : ''}`,
          metadata: {
            inviteId: invite.id,
            projectId: params.id,
            projectName: project.name,
            role: role || 'contributor',
            message: message || null,
            relayId: relay.id,
          },
          // v2.3.2 — scope on the notification
          projectId: params.id,
        }).catch(() => {});
      }
    } catch (relayErr: any) {
      // Don't fail the invite if relay/comms creation fails
      console.warn('Failed to create relay/comms for project invite:', relayErr?.message);
    }
  }

  return NextResponse.json({
    success: true,
    invite,
    relayId: relayCreated?.id || null,
    replacedInviteId,
    message: replacedInviteId
      ? 'Invite re-sent.'
      : `Invite sent${inviteeId ? '' : ' (user not on DiviDen yet)'}.`,
  });
}

/**
 * GET /api/projects/[id]/invite — List invites for a project
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  // Verify membership
  const member = await prisma.projectMember.findFirst({
    where: { projectId: params.id, userId },
  });
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!member && project?.createdById !== userId) {
    return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
  }

  const invites = await prisma.projectInvite.findMany({
    where: { projectId: params.id },
    include: {
      inviter: { select: { id: true, name: true, email: true } },
      invitee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, invites });
}
