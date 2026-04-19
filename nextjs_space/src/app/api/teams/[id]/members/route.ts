export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkTeamMemberLimit, FeatureGateError } from '@/lib/feature-gates';
import { syncNewMemberToTeamProjects } from '@/lib/team-project-sync';
import { logActivity } from '@/lib/activity';
import { pushNotificationToFederatedInstance } from '@/lib/federation-push';

// POST /api/teams/:id/members — add a member (local user or federated connection)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Check caller is owner/admin
    const callerMembership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: { in: ['owner', 'admin'] } },
    });
    if (!callerMembership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    // Enforce member limit based on subscription
    try {
      await checkTeamMemberLimit(params.id);
    } catch (err) {
      if (err instanceof FeatureGateError) {
        return NextResponse.json({ error: err.message, code: err.code, tier: err.tier }, { status: 403 });
      }
      throw err;
    }

    const body = await req.json();
    const { email, connectionId, role } = body;

    // Fetch team name for logging
    const team = await prisma.team.findUnique({ where: { id: params.id }, select: { name: true } });
    const teamName = team?.name || 'Unknown team';

    if (connectionId) {
      // Federated member via connection
      const connection = await prisma.connection.findFirst({
        where: { id: connectionId, status: 'active', isFederated: true },
      });
      if (!connection) return NextResponse.json({ error: 'Connection not found or not active' }, { status: 404 });

      const member = await prisma.teamMember.create({
        data: {
          teamId: params.id,
          connectionId,
          role: role || 'member',
        },
        include: { connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true } } },
      });

      // Auto-sync new member to all team projects
      await syncNewMemberToTeamProjects(params.id, null, connectionId).catch(() => {});

      const peerLabel = connection.peerUserName || connection.peerUserEmail || 'federated user';
      await logActivity({
        userId,
        action: 'team_member_added',
        summary: `Added ${peerLabel} (federated) to team "${teamName}"`,
        metadata: { teamId: params.id, connectionId, role: role || 'member' },
      }).catch(() => {});

      return NextResponse.json(member, { status: 201 });
    }

    if (!email) return NextResponse.json({ error: 'Email or connectionId required' }, { status: 400 });

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Check not already a member
    const existing = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId: targetUser.id },
    });
    if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 });

    const member = await prisma.teamMember.create({
      data: {
        teamId: params.id,
        userId: targetUser.id,
        role: role || 'member',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Auto-sync new member to all team projects
    await syncNewMemberToTeamProjects(params.id, targetUser.id, null).catch(() => {});

    // Log for the adder
    await logActivity({
      userId,
      action: 'team_member_added',
      summary: `Added ${targetUser.name || targetUser.email} to team "${teamName}"`,
      metadata: { teamId: params.id, addedUserId: targetUser.id, role: role || 'member' },
    }).catch(() => {});

    // Log for the added user + queue notification
    await logActivity({
      userId: targetUser.id,
      action: 'team_member_joined',
      summary: `You were added to team "${teamName}"`,
      metadata: { teamId: params.id, addedBy: userId, role: role || 'member' },
    }).catch(() => {});

    await prisma.queueItem.create({
      data: {
        userId: targetUser.id,
        type: 'notification',
        title: `Added to team "${teamName}"`,
        description: `You were added as a ${role || 'member'} to the team "${teamName}".`,
        status: 'open',
        priority: 'normal',
      },
    }).catch(() => {});

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/teams/:id/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/teams/:id/members — remove a member
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const callerMembership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: { in: ['owner', 'admin'] } },
    });
    if (!callerMembership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 });

    // Cannot remove the owner
    const target = await prisma.teamMember.findFirst({ where: { id: memberId, teamId: params.id } });
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    if (target.role === 'owner') return NextResponse.json({ error: 'Cannot remove the team owner' }, { status: 400 });

    await prisma.teamMember.delete({ where: { id: memberId } });

    // Log member removal
    const teamForLog = await prisma.team.findUnique({ where: { id: params.id }, select: { name: true } });
    const removedLabel = target.userId
      ? (await prisma.user.findUnique({ where: { id: target.userId }, select: { name: true, email: true } }))?.name || 'a member'
      : 'a federated member';
    await logActivity({
      userId,
      action: 'team_member_removed',
      summary: `Removed ${removedLabel} from team "${teamForLog?.name || 'Unknown'}"`,
      metadata: { teamId: params.id, removedMemberId: memberId },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/teams/:id/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/teams/:id/members — v2.3.5 role change (four-signal pattern)
//
// Body: { memberId: string, role: string }
// Emits: TeamMember update + QueueItem + AgentRelay + CommsMessage
//        + federation push if the member is federated (connectionId)
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const callerName = (session.user as any).name || (session.user as any).email || 'Someone';

    // Only owner/admin can change roles
    const callerMembership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: { in: ['owner', 'admin'] } },
    });
    if (!callerMembership) return NextResponse.json({ error: 'Only team owner or admin can change roles' }, { status: 403 });

    const body = await req.json();
    const { memberId, role } = body;
    if (!memberId || !role) return NextResponse.json({ error: 'memberId and role required' }, { status: 400 });

    const validRoles = ['owner', 'admin', 'member'];
    if (!validRoles.includes(role)) return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });

    const target = await prisma.teamMember.findFirst({
      where: { id: memberId, teamId: params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true, isFederated: true } },
      },
    });
    if (!target) return NextResponse.json({ error: 'Member not found in this team' }, { status: 404 });

    // Cannot change owner's role (owner must transfer ownership explicitly)
    if (target.role === 'owner' && role !== 'owner') {
      return NextResponse.json({ error: 'Cannot demote the team owner. Transfer ownership first.' }, { status: 400 });
    }

    const oldRole = target.role;
    if (oldRole === role) return NextResponse.json({ error: 'Role unchanged', code: 'NO_CHANGE' }, { status: 409 });

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      select: { name: true },
    });
    const teamName = team?.name || 'Unknown team';
    const direction = validRoles.indexOf(role) < validRoles.indexOf(oldRole) ? 'promoted' : 'demoted';
    const targetName = target.user?.name || target.user?.email || target.connection?.peerUserName || target.connection?.peerUserEmail || 'a member';

    // ── Signal 1: DB update ───────────────────────────────────────────────
    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
    });

    // ── Signal 2: QueueItem for the affected member ───────────────────────
    const queueUserId = target.userId;
    if (queueUserId) {
      await prisma.queueItem.create({
        data: {
          type: 'notification',
          title: `👥 Role ${direction}: ${teamName}`,
          description: `${callerName} ${direction} you to ${role} on team "${teamName}".`,
          priority: 'medium',
          status: 'ready',
          source: 'system',
          userId: queueUserId,
          teamId: params.id,
          metadata: JSON.stringify({ type: 'team_role_change', memberId, oldRole, newRole: role, changedBy: userId }),
        },
      });
    }

    // ── Signal 3: AgentRelay ──────────────────────────────────────────────
    const relayPayload = {
      kind: 'team_role_change',
      memberId,
      teamId: params.id,
      teamName,
      targetName,
      oldRole,
      newRole: role,
      direction,
      changedByName: callerName,
    };

    const relayConnectionId = target.connectionId || callerMembership.connectionId || await prisma.connection.findFirst({
      where: { OR: [{ requesterId: userId }, { accepterId: userId }], status: 'active' },
      select: { id: true },
    }).then(c => c?.id || '');

    let relay: any = null;
    if (relayConnectionId) {
      relay = await prisma.agentRelay.create({
        data: {
          connectionId: relayConnectionId,
          fromUserId: userId,
          type: 'notification',
          intent: 'notify',
          subject: `Role change: ${targetName} ${direction} to ${role} on ${teamName}`,
          payload: JSON.stringify(relayPayload),
          status: 'completed',
          resolvedAt: new Date(),
          teamId: params.id,
        },
      });
    }

    // ── Signal 4: CommsMessage ────────────────────────────────────────────
    if (queueUserId) {
      await prisma.commsMessage.create({
        data: {
          userId: queueUserId,
          sender: 'agent',
          content: `👥 Your role on team "${teamName}" was changed from **${oldRole}** to **${role}** by ${callerName}.`,
          metadata: JSON.stringify({ kind: 'team_role_change', teamId: params.id, memberId, oldRole, newRole: role, relayId: relay?.id }),
        },
      });
    }

    await prisma.commsMessage.create({
      data: {
        userId,
        sender: 'agent',
        content: `👥 You ${direction} ${targetName} to **${role}** on team "${teamName}".`,
        metadata: JSON.stringify({ kind: 'team_role_change', teamId: params.id, memberId, oldRole, newRole: role, relayId: relay?.id }),
      },
    });

    // ── Federation push (if federated member) ─────────────────────────────
    if (relay && target.connectionId && target.connection?.peerInstanceUrl) {
      pushNotificationToFederatedInstance(target.connectionId, {
        type: 'team_role_change',
        fromUserName: callerName,
        fromUserEmail: (session.user as any).email || '',
        title: `Role changed on ${teamName}`,
        body: `${callerName} ${direction} ${targetName} to ${role} on team "${teamName}"`,
        metadata: { teamId: params.id, memberId, oldRole, newRole: role },
        teamId: params.id,
      }).catch((e: any) => console.error('v2.3.5 federation notification push failed:', e));
    }

    // ── Activity logs ─────────────────────────────────────────────────────
    logActivity({ userId, action: 'team_role_changed', summary: `${direction.charAt(0).toUpperCase() + direction.slice(1)} ${targetName} to ${role} on team "${teamName}"`, actor: 'user', metadata: { teamId: params.id, memberId, oldRole, newRole: role } });
    if (queueUserId) {
      logActivity({ userId: queueUserId, action: 'team_role_changed', summary: `You were ${direction} to ${role} on team "${teamName}" by ${callerName}`, actor: 'system', metadata: { teamId: params.id, memberId, oldRole, newRole: role, changedBy: userId } });
    }

    return NextResponse.json({ success: true, memberId, oldRole, newRole: role, direction, relayId: relay?.id });
  } catch (error: any) {
    console.error('PATCH /api/teams/:id/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}