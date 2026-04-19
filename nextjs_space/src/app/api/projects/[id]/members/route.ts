export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { pushNotificationToFederatedInstance } from '@/lib/federation-push';

// POST /api/projects/:id/members — add a member
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const callerMembership = await prisma.projectMember.findFirst({
      where: { projectId: params.id, userId, role: { in: ['lead', 'contributor'] } },
    });
    if (!callerMembership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const body = await req.json();
    const { email, connectionId, role } = body;

    const project = await prisma.project.findUnique({ where: { id: params.id }, select: { name: true } });
    const projectName = project?.name || 'a project';

    if (connectionId) {
      // Federated member via connection
      const connection = await prisma.connection.findFirst({
        where: { id: connectionId, status: 'active' },
      });
      if (!connection) return NextResponse.json({ error: 'Connection not found or not active' }, { status: 404 });

      const member = await prisma.projectMember.create({
        data: {
          projectId: params.id,
          connectionId,
          role: role || 'contributor',
        },
        include: { connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true } } },
      });

      logActivity({ userId, action: 'project_member_added', summary: `Added ${connection.peerUserName || connection.peerUserEmail || 'federated user'} to "${projectName}"`, actor: 'user', metadata: { projectId: params.id, connectionId, federated: true } });

      return NextResponse.json(member, { status: 201 });
    }

    if (!email) return NextResponse.json({ error: 'Email or connectionId required' }, { status: 400 });

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const existing = await prisma.projectMember.findFirst({
      where: { projectId: params.id, userId: targetUser.id },
    });
    if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 });

    const member = await prisma.projectMember.create({
      data: {
        projectId: params.id,
        userId: targetUser.id,
        role: role || 'contributor',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Activity logs for both parties
    logActivity({ userId, action: 'project_member_added', summary: `Added ${targetUser.name || targetUser.email} to "${projectName}"`, actor: 'user', metadata: { projectId: params.id, memberId: targetUser.id } });
    logActivity({ userId: targetUser.id, action: 'project_member_joined', summary: `You were added to project "${projectName}"`, actor: 'system', metadata: { projectId: params.id, addedBy: userId } });

    // Queue notification for the added member
    await prisma.queueItem.create({
      data: {
        type: 'notification',
        title: `📋 Added to project: ${projectName}`,
        description: `${(session.user as any).name || 'Someone'} added you to "${projectName}" as ${role || 'contributor'}.`,
        priority: 'medium',
        status: 'ready',
        source: 'system',
        userId: targetUser.id,
        projectId: params.id,
        metadata: JSON.stringify({ type: 'project_member_added' }),
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/projects/:id/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/projects/:id/members — remove a member
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const callerMembership = await prisma.projectMember.findFirst({
      where: { projectId: params.id, userId, role: 'lead' },
    });
    if (!callerMembership) return NextResponse.json({ error: 'Only lead can remove members' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 });

    const target = await prisma.projectMember.findFirst({ where: { id: memberId, projectId: params.id } });
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    if (target.role === 'lead' && target.userId === userId) {
      return NextResponse.json({ error: 'Cannot remove yourself as lead' }, { status: 400 });
    }

    await prisma.projectMember.delete({ where: { id: memberId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/projects/:id/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/projects/:id/members — v2.3.5 role change (four-signal pattern)
//
// Body: { memberId: string, role: string }
// Emits: ProjectMember update + QueueItem + AgentRelay + CommsMessage
//        + federation push if the member is federated (connectionId)
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const callerName = (session.user as any).name || (session.user as any).email || 'Someone';

    // Only lead can change roles
    const callerMembership = await prisma.projectMember.findFirst({
      where: { projectId: params.id, userId, role: 'lead' },
    });
    if (!callerMembership) return NextResponse.json({ error: 'Only project lead can change roles' }, { status: 403 });

    const body = await req.json();
    const { memberId, role } = body;
    if (!memberId || !role) return NextResponse.json({ error: 'memberId and role required' }, { status: 400 });

    const validRoles = ['lead', 'contributor', 'reviewer', 'observer'];
    if (!validRoles.includes(role)) return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });

    const target = await prisma.projectMember.findFirst({
      where: { id: memberId, projectId: params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true, isFederated: true } },
      },
    });
    if (!target) return NextResponse.json({ error: 'Member not found in this project' }, { status: 404 });

    const oldRole = target.role;
    if (oldRole === role) return NextResponse.json({ error: 'Role unchanged', code: 'NO_CHANGE' }, { status: 409 });

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { name: true, teamId: true },
    });
    const projectName = project?.name || 'Unknown project';
    const direction = validRoles.indexOf(role) < validRoles.indexOf(oldRole) ? 'promoted' : 'demoted';
    const targetName = target.user?.name || target.user?.email || target.connection?.peerUserName || target.connection?.peerUserEmail || 'a member';

    // ── Signal 1: DB update ───────────────────────────────────────────────
    const updated = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
    });

    // ── Signal 2: QueueItem for the affected member ───────────────────────
    const queueUserId = target.userId; // null for federated members
    if (queueUserId) {
      await prisma.queueItem.create({
        data: {
          type: 'notification',
          title: `📋 Role ${direction}: ${projectName}`,
          description: `${callerName} ${direction} you to ${role} on "${projectName}".`,
          priority: 'medium',
          status: 'ready',
          source: 'system',
          userId: queueUserId,
          projectId: params.id,
          metadata: JSON.stringify({ type: 'project_role_change', memberId, oldRole, newRole: role, changedBy: userId }),
        },
      });
    }

    // ── Signal 3: AgentRelay ──────────────────────────────────────────────
    const relayPayload = {
      kind: 'project_role_change',
      memberId,
      projectId: params.id,
      projectName,
      targetName,
      oldRole,
      newRole: role,
      direction,
      changedByName: callerName,
    };

    // Pick a connectionId for the relay — use the target's if federated, else find caller's default
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
          subject: `Role change: ${targetName} ${direction} to ${role} on ${projectName}`,
          payload: JSON.stringify(relayPayload),
          status: 'completed',
          resolvedAt: new Date(),
          projectId: params.id,
          teamId: project?.teamId || undefined,
        },
      });
    }

    // ── Signal 4: CommsMessage ────────────────────────────────────────────
    // To the affected member (if local)
    if (queueUserId) {
      await prisma.commsMessage.create({
        data: {
          userId: queueUserId,
          sender: 'agent',
          content: `📋 Your role on "${projectName}" was changed from **${oldRole}** to **${role}** by ${callerName}.`,
          metadata: JSON.stringify({ kind: 'project_role_change', projectId: params.id, memberId, oldRole, newRole: role, relayId: relay?.id }),
        },
      });
    }

    // Also message the changer (audit trail)
    await prisma.commsMessage.create({
      data: {
        userId,
        sender: 'agent',
        content: `📋 You ${direction} ${targetName} to **${role}** on "${projectName}".`,
        metadata: JSON.stringify({ kind: 'project_role_change', projectId: params.id, memberId, oldRole, newRole: role, relayId: relay?.id }),
      },
    });

    // ── Federation push (if federated member) ─────────────────────────────
    if (relay && target.connectionId && target.connection?.peerInstanceUrl) {
      pushNotificationToFederatedInstance(target.connectionId, {
        type: 'project_role_change',
        fromUserName: callerName,
        fromUserEmail: (session.user as any).email || '',
        title: `Role changed on ${projectName}`,
        body: `${callerName} ${direction} ${targetName} to ${role} on "${projectName}"`,
        metadata: { projectId: params.id, memberId, oldRole, newRole: role },
        teamId: project?.teamId || undefined,
        projectId: params.id,
      }).catch((e: any) => console.error('v2.3.5 federation notification push failed:', e));
    }

    // ── Activity logs ─────────────────────────────────────────────────────
    logActivity({ userId, action: 'project_role_changed', summary: `${direction.charAt(0).toUpperCase() + direction.slice(1)} ${targetName} to ${role} on "${projectName}"`, actor: 'user', metadata: { projectId: params.id, memberId, oldRole, newRole: role } });
    if (queueUserId) {
      logActivity({ userId: queueUserId, action: 'project_role_changed', summary: `You were ${direction} to ${role} on "${projectName}" by ${callerName}`, actor: 'system', metadata: { projectId: params.id, memberId, oldRole, newRole: role, changedBy: userId } });
    }

    return NextResponse.json({ success: true, memberId, oldRole, newRole: role, direction, relayId: relay?.id });
  } catch (error: any) {
    console.error('PATCH /api/projects/:id/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}