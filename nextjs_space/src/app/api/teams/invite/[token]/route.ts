export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkTeamMemberLimit, FeatureGateError } from '@/lib/feature-gates';
import { syncNewMemberToTeamProjects } from '@/lib/team-project-sync';

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
