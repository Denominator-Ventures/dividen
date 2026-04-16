export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncNewMemberToTeamProjects } from '@/lib/team-project-sync';
import { logActivity } from '@/lib/activity';

// POST /api/teams/:id/invites — create an invite (email, userId, or connectionId)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Caller must be owner or admin
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: { in: ['owner', 'admin'] } },
    });
    if (!membership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const body = await req.json();
    const { email, inviteeId, connectionId, role, message } = body;

    if (!email && !inviteeId && !connectionId) {
      return NextResponse.json({ error: 'email, inviteeId, or connectionId required' }, { status: 400 });
    }

    // Resolve invitee
    let resolvedInviteeId = inviteeId || null;
    let resolvedEmail = email || null;
    if (email && !resolvedInviteeId) {
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
      if (user) resolvedInviteeId = user.id;
    }

    // Check for existing invite
    if (resolvedInviteeId) {
      const existing = await prisma.teamInvite.findFirst({
        where: { teamId: params.id, inviteeId: resolvedInviteeId, status: 'pending' },
      });
      if (existing) return NextResponse.json({ error: 'Invite already pending' }, { status: 409 });

      // Check if already a member
      const alreadyMember = await prisma.teamMember.findFirst({
        where: { teamId: params.id, userId: resolvedInviteeId },
      });
      if (alreadyMember) return NextResponse.json({ error: 'Already a team member' }, { status: 409 });
    }

    const invite = await prisma.teamInvite.create({
      data: {
        teamId: params.id,
        inviterId: userId,
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

    // Log invite sent
    const inviteeLabel = resolvedEmail || (resolvedInviteeId ? 'a user' : 'a connection');
    await logActivity({
      userId,
      action: 'team_invite_sent',
      summary: `Invited ${inviteeLabel} to team "${invite.team.name}"`,
      metadata: { teamId: params.id, inviteId: invite.id, role: role || 'member' },
    }).catch(() => {});

    // If invitee is a local user, notify them
    if (resolvedInviteeId) {
      await logActivity({
        userId: resolvedInviteeId,
        action: 'team_invite_received',
        summary: `You were invited to join team "${invite.team.name}"`,
        metadata: { teamId: params.id, inviteId: invite.id, inviterId: userId },
      }).catch(() => {});

      await prisma.queueItem.create({
        data: {
          userId: resolvedInviteeId,
          type: 'notification',
          title: `Team invite: ${invite.team.name}`,
          description: `You were invited to join "${invite.team.name}" as ${role || 'member'}.${message ? ` Message: ${message}` : ''}`,
          status: 'open',
          priority: 'normal',
        },
      }).catch(() => {});
    }

    return NextResponse.json(invite, { status: 201 });
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
