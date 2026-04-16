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

  const { userId: inviteeUserId, email, connectionId, role, message } = body;

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
    if (existing) return NextResponse.json({ error: 'User is already a project member' }, { status: 409 });
  }

  // Check if already invited (pending)
  if (inviteeId) {
    const existingInvite = await prisma.projectInvite.findUnique({
      where: { projectId_inviteeId: { projectId: params.id, inviteeId } },
    });
    if (existingInvite && existingInvite.status === 'pending') {
      return NextResponse.json({ error: 'Invite already pending for this user' }, { status: 409 });
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

  // Notification for invitee — activity log + queue item
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

  return NextResponse.json({
    success: true,
    invite,
    message: `Invite sent${inviteeId ? '' : ' (user not on DiviDen yet)'}.`,
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
