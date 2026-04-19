export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkTeamMemberLimit, FeatureGateError } from '@/lib/feature-gates';
import { syncNewMemberToTeamProjects } from '@/lib/team-project-sync';
import { logActivity } from '@/lib/activity';

// GET /api/teams/invite/:token — get invite details (no auth required for preview)
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const invite = await prisma.teamInvite.findUnique({
      where: { token: params.token },
      include: {
        team: { select: { id: true, name: true, avatar: true, description: true, headline: true, type: true, _count: { select: { members: true } } } },
        inviter: { select: { id: true, name: true } },
      },
    });

    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    if (invite.status !== 'pending') return NextResponse.json({ error: `Invite has been ${invite.status}` }, { status: 410 });
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      await prisma.teamInvite.update({ where: { id: invite.id }, data: { status: 'expired' } });
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
    }

    return NextResponse.json(invite);
  } catch (error: any) {
    console.error('GET /api/teams/invite/:token error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/teams/invite/:token — accept or decline an invite
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized — log in to accept' }, { status: 401 });
    const userId = (session.user as any).id;

    const invite = await prisma.teamInvite.findUnique({
      where: { token: params.token },
      include: { team: { select: { id: true, name: true } } },
    });

    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    if (invite.status !== 'pending') return NextResponse.json({ error: `Invite has been ${invite.status}` }, { status: 410 });
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      await prisma.teamInvite.update({ where: { id: invite.id }, data: { status: 'expired' } });
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
    }

    const body = await req.json();
    const { action } = body; // "accept" | "decline"

    if (action === 'decline') {
      await prisma.teamInvite.update({
        where: { id: invite.id },
        data: { status: 'declined', declinedAt: new Date() },
      });

      // v2.3.4 — stamp AgentRelay with status='declined' and ack back to inviter
      try {
        const relays = await prisma.agentRelay.findMany({
          where: {
            teamId: invite.teamId,
            intent: 'introduce',
            status: 'pending',
            payload: { contains: `"inviteId":"${invite.id}"` },
          },
          select: { id: true },
        });
        if (relays.length > 0) {
          await prisma.agentRelay.updateMany({
            where: { id: { in: relays.map(r => r.id) } },
            data: { status: 'declined', resolvedAt: new Date() },
          });
        }

        // Delete pending QueueItem
        await prisma.queueItem.deleteMany({
          where: {
            userId,
            kind: 'team_invite',
            status: 'pending',
            metadata: { contains: `"inviteId":"${invite.id}"` },
          },
        });

        // Write decline CommsMessage to inviter
        if (invite.inviterId) {
          const declinerName = (session.user as any).name || (session.user as any).email || 'Someone';
          await prisma.commsMessage.create({
            data: {
              userId: invite.inviterId,
              sender: 'agent',
              content: `❌ ${declinerName} declined your invite to team "${invite.team.name}".`,
              metadata: JSON.stringify({ kind: 'team_invite_declined', inviteId: invite.id, teamId: invite.teamId, declinedBy: userId }),
            },
          });
        }
      } catch (e) {
        console.error('v2.3.4 decline relay stamp failed:', e);
      }

      await logActivity({
        userId,
        action: 'team_invite_declined',
        summary: `Declined invite to team "${invite.team.name}"`,
        metadata: { teamId: invite.teamId, inviteId: invite.id },
      }).catch(() => {});

      return NextResponse.json({ success: true, action: 'declined' });
    }

    // Accept — check member limit
    try {
      await checkTeamMemberLimit(invite.teamId);
    } catch (err) {
      if (err instanceof FeatureGateError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
      }
      throw err;
    }

    // Check not already a member
    const existing = await prisma.teamMember.findFirst({
      where: { teamId: invite.teamId, userId },
    });
    if (existing) {
      await prisma.teamInvite.update({ where: { id: invite.id }, data: { status: 'accepted', acceptedAt: new Date() } });
      return NextResponse.json({ success: true, action: 'accepted', alreadyMember: true });
    }

    // Create membership
    const member = await prisma.teamMember.create({
      data: {
        teamId: invite.teamId,
        userId,
        connectionId: invite.connectionId,
        role: invite.role || 'member',
      },
    });

    // Mark invite accepted
    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: 'accepted', acceptedAt: new Date(), inviteeId: userId },
    });

    // Auto-sync new member to all team projects
    const projectsAdded = await syncNewMemberToTeamProjects(invite.teamId, userId, invite.connectionId);

    // Log acceptance for the accepter
    await logActivity({
      userId,
      action: 'team_invite_accepted',
      summary: `Joined team "${invite.team.name}"`,
      metadata: { teamId: invite.teamId, inviteId: invite.id, role: member.role },
    }).catch(() => {});

    // v2.3.4 — stamp AgentRelay with status='completed' and ack back to inviter
    try {
      const relays = await prisma.agentRelay.findMany({
        where: {
          teamId: invite.teamId,
          intent: 'introduce',
          status: 'pending',
          payload: { contains: `"inviteId":"${invite.id}"` },
        },
        select: { id: true },
      });
      if (relays.length > 0) {
        await prisma.agentRelay.updateMany({
          where: { id: { in: relays.map(r => r.id) } },
          data: { status: 'completed', resolvedAt: new Date() },
        });
      }

      // Delete pending QueueItem
      await prisma.queueItem.deleteMany({
        where: {
          userId,
          kind: 'team_invite',
          status: 'pending',
          metadata: { contains: `"inviteId":"${invite.id}"` },
        },
      });

      // Write acceptance CommsMessage to inviter
      if (invite.inviterId) {
        const accepterName = (session.user as any).name || (session.user as any).email || 'Someone';
        await prisma.commsMessage.create({
          data: {
            userId: invite.inviterId,
            sender: 'agent',
            content: `✅ ${accepterName} accepted your invite to team "${invite.team.name}".`,
            metadata: JSON.stringify({ kind: 'team_invite_accepted', inviteId: invite.id, teamId: invite.teamId, acceptedBy: userId, role: member.role }),
          },
        });
      }
    } catch (e) {
      console.error('v2.3.4 accept relay stamp failed:', e);
    }

    // Notify the inviter that their invite was accepted
    if (invite.inviterId) {
      await logActivity({
        userId: invite.inviterId,
        action: 'team_member_joined',
        summary: `Your invite to team "${invite.team.name}" was accepted`,
        metadata: { teamId: invite.teamId, acceptedBy: userId },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      action: 'accepted',
      teamId: invite.teamId,
      teamName: invite.team.name,
      memberId: member.id,
      role: member.role,
      projectsJoined: projectsAdded,
    });
  } catch (error: any) {
    console.error('POST /api/teams/invite/:token error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
