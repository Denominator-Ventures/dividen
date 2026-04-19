export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

/**
 * POST /api/teams/:id/invites — create a team invite (email, inviteeId, or connectionId)
 *
 * v2.3.4: Four-Signal Pattern
 *   1. TeamInvite    — canonical invite record
 *   2. QueueItem     — invitee's task list surface (local invitee only)
 *   3. AgentRelay    — intent='introduce', payload.kind='team_invite', teamId scope
 *   4. CommsMessage  — invitee's CommsTab row (local invitee only)
 *   + federation push to peer instance if the target connection is federated
 *
 * Accepts `force: true` to dismiss an ALREADY_INVITED (409) and retry by deleting
 * the existing pending invite + its queue item + its relay.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const inviterId = (session.user as any).id;

    // Caller must be owner or admin
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId: inviterId, role: { in: ['owner', 'admin'] } },
    });
    if (!membership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, avatar: true },
    });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    let body: any;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { email, inviteeId: providedInviteeId, connectionId, role, message, force } = body;

    if (!email && !providedInviteeId && !connectionId) {
      return NextResponse.json({ error: 'email, inviteeId, or connectionId required' }, { status: 400 });
    }

    // Resolve invitee
    let resolvedInviteeId: string | null = providedInviteeId || null;
    let resolvedEmail: string | null = email || null;
    if (email && !resolvedInviteeId) {
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
      if (user) resolvedInviteeId = user.id;
    }

    // Guard: already a member
    if (resolvedInviteeId) {
      const alreadyMember = await prisma.teamMember.findFirst({
        where: { teamId: params.id, userId: resolvedInviteeId },
      });
      if (alreadyMember) return NextResponse.json({ error: 'Already a team member', code: 'ALREADY_MEMBER' }, { status: 409 });
    }

    // v2.3.4: duplicate guard + force-reinvite — parallel to project invite
    let replacedInviteId: string | null = null;
    if (resolvedInviteeId) {
      const existing = await prisma.teamInvite.findUnique({
        where: { teamId_inviteeId: { teamId: params.id, inviteeId: resolvedInviteeId } },
      });
      if (existing && existing.status === 'pending') {
        if (!force) {
          return NextResponse.json({
            error: 'Invite already pending for this user',
            code: 'ALREADY_INVITED',
            inviteId: existing.id,
          }, { status: 409 });
        }
        // force-reinvite: wipe old invite + its queue item + old relay
        replacedInviteId = existing.id;
        try {
          await prisma.queueItem.deleteMany({
            where: {
              userId: resolvedInviteeId,
              teamId: params.id,
              metadata: { contains: `"inviteId":"${existing.id}"` },
            },
          });
        } catch { /* non-fatal */ }
        try {
          await prisma.agentRelay.deleteMany({
            where: {
              fromUserId: inviterId,
              teamId: params.id,
              intent: 'introduce',
              payload: { contains: `"inviteId":"${existing.id}"` },
            },
          });
        } catch { /* non-fatal */ }
        await prisma.teamInvite.delete({ where: { id: existing.id } });
      }
    }
    // Email-only duplicate guard (for users not yet on DiviDen)
    if (!resolvedInviteeId && resolvedEmail) {
      const existingByEmail = await prisma.teamInvite.findFirst({
        where: { teamId: params.id, inviteeEmail: resolvedEmail, status: 'pending' },
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
        await prisma.teamInvite.delete({ where: { id: existingByEmail.id } });
      }
    }

    // Signal 1: TeamInvite
    const invite = await prisma.teamInvite.create({
      data: {
        teamId: params.id,
        inviterId,
        inviteeId: resolvedInviteeId,
        inviteeEmail: resolvedEmail,
        connectionId: connectionId || null,
        role: role || 'member',
        message: message || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        team: { select: { id: true, name: true, avatar: true } },
        inviter: { select: { id: true, name: true, email: true } },
      },
    });

    // Activity log for inviter
    const inviteeLabel = resolvedEmail || (resolvedInviteeId ? 'a user' : 'a connection');
    await logActivity({
      userId: inviterId,
      action: 'team_invite_sent',
      summary: `Invited ${inviteeLabel} to team "${team.name}"`,
      metadata: { teamId: params.id, inviteId: invite.id, role: role || 'member' },
    }).catch(() => {});

    // Signal 2: QueueItem (local invitee only)
    if (resolvedInviteeId) {
      await logActivity({
        userId: resolvedInviteeId,
        action: 'team_invite_received',
        summary: `You were invited to join team "${team.name}"`,
        metadata: { teamId: params.id, inviteId: invite.id, inviterId },
      }).catch(() => {});

      await prisma.queueItem.create({
        data: {
          userId: resolvedInviteeId,
          type: 'notification',
          title: `👥 Team invite: ${team.name}`,
          description: `You were invited to join "${team.name}" as ${role || 'member'}.${message ? ` Message: ${message}` : ''}`,
          status: 'ready',
          priority: 'medium',
          source: 'system',
          teamId: params.id,
          metadata: JSON.stringify({ type: 'team_invite', inviteId: invite.id }),
        },
      }).catch(() => {});
    }

    // Signals 3 + 4: AgentRelay + CommsMessage (local invitee only or federated connection)
    // Find a connection between inviter and invitee so we can log the relay.
    let relayConnectionId: string | null = connectionId || null;
    if (!relayConnectionId && resolvedInviteeId) {
      const conn = await prisma.connection.findFirst({
        where: {
          status: 'active',
          OR: [
            { requesterId: inviterId, accepterId: resolvedInviteeId },
            { requesterId: resolvedInviteeId, accepterId: inviterId },
          ],
        },
        select: { id: true },
      });
      if (conn) relayConnectionId = conn.id;
    }

    let relayCreated: { id: string } | null = null;
    if (relayConnectionId) {
      try {
        const relayConn = await prisma.connection.findUnique({
          where: { id: relayConnectionId },
          select: { id: true, isFederated: true, peerInstanceUrl: true, peerUserEmail: true },
        });

        const senderName = (session.user as any).name || (session.user as any).email || 'Someone';
        const senderEmail = (session.user as any).email || '';
        const relaySubject = `Team invite: ${team.name}`;
        const relayPayload = {
          kind: 'team_invite',
          inviteId: invite.id,
          teamId: params.id,
          teamName: team.name,
          role: role || 'member',
          message: message || null,
          inviterName: senderName,
        };

        // Signal 3: AgentRelay
        const relay = await prisma.agentRelay.create({
          data: {
            connectionId: relayConnectionId,
            fromUserId: inviterId,
            toUserId: relayConn?.isFederated ? null : (resolvedInviteeId || null),
            direction: 'outbound',
            type: 'request',
            intent: 'introduce',
            subject: relaySubject,
            payload: JSON.stringify(relayPayload),
            status: relayConn?.isFederated ? 'pending' : (resolvedInviteeId ? 'delivered' : 'pending'),
            priority: 'normal',
            teamId: params.id, // v2.3.4: scope the relay to the team
            peerInstanceUrl: relayConn?.isFederated ? relayConn.peerInstanceUrl : null,
          },
        });
        relayCreated = { id: relay.id };

        // Signal 4: CommsMessage (local invitee only)
        if (resolvedInviteeId && !relayConn?.isFederated) {
          await prisma.commsMessage.create({
            data: {
              sender: 'divi',
              content: `📡 ${senderName}'s Divi requested you join team "${team.name}" as ${role || 'member'}.${message ? ` — "${message}"` : ''}`,
              state: 'new',
              priority: 'normal',
              userId: resolvedInviteeId,
              metadata: JSON.stringify({ type: 'team_invite', inviteId: invite.id, relayId: relay.id, teamId: params.id }),
            },
          });
        }

        // Federation push — ship the invite across the wire with teamId scope
        if (relayConn?.isFederated) {
          const { pushRelayToFederatedInstance, pushNotificationToFederatedInstance } = await import('@/lib/federation-push');

          pushRelayToFederatedInstance(relayConn.id, {
            relayId: relay.id,
            fromUserEmail: senderEmail,
            fromUserName: senderName,
            fromUserId: inviterId,
            toUserEmail: resolvedEmail || relayConn.peerUserEmail || '',
            type: 'request',
            intent: 'introduce',
            subject: relaySubject,
            payload: relayPayload,
            priority: 'normal',
            // v2.3.4: team scope on the wire
            teamId: params.id,
          }).catch(() => {});

          pushNotificationToFederatedInstance(relayConn.id, {
            type: 'team_invite',
            fromUserName: senderName,
            fromUserEmail: senderEmail,
            title: relaySubject,
            body: `${senderName} invited you to team "${team.name}" as ${role || 'member'}.${message ? ` — "${message}"` : ''}`,
            metadata: {
              inviteId: invite.id,
              teamId: params.id,
              teamName: team.name,
              role: role || 'member',
              message: message || null,
              relayId: relay.id,
            },
            // v2.3.4: scope on the notification
            teamId: params.id,
          }).catch(() => {});
        }
      } catch (relayErr: any) {
        // Don't fail the invite if relay/comms creation fails
        console.warn('Failed to create relay/comms for team invite:', relayErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      invite,
      relayId: relayCreated?.id || null,
      replacedInviteId,
      message: replacedInviteId
        ? 'Invite re-sent.'
        : `Invite sent${resolvedInviteeId ? '' : ' (user not on DiviDen yet)'}.`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/teams/:id/invites error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/teams/:id/invites — list pending invites
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId },
    });
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

    const invites = await prisma.teamInvite.findMany({
      where: { teamId: params.id },
      include: {
        inviter: { select: { id: true, name: true, email: true } },
        invitee: { select: { id: true, name: true, email: true } },
        connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invites);
  } catch (error: any) {
    console.error('GET /api/teams/:id/invites error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
