export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

/**
 * GET /api/project-invites — List invites for current user (received)
 * Query: ?status=pending&type=received|sent
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const type = searchParams.get('type') || 'received';

  let where: any;
  if (type === 'sent') {
    where = { inviterId: userId };
  } else {
    // Received invites: direct invites + federated invites via connections I own
    const myFederatedConnections = await prisma.connection.findMany({
      where: { requesterId: userId, isFederated: true },
      select: { id: true },
    });
    const connIds = myFederatedConnections.map((c: any) => c.id);

    where = {
      OR: [
        { inviteeId: userId },
        ...(connIds.length > 0 ? [{ connectionId: { in: connIds } }] : []),
      ],
    };
  }
  if (status) where.status = status;

  const invites = await prisma.projectInvite.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, description: true, status: true, color: true } },
      inviter: { select: { id: true, name: true, email: true } },
      invitee: { select: { id: true, name: true, email: true } },
      job: { select: { id: true, title: true, compensationType: true, compensationAmount: true, compensationCurrency: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, invites });
}

/**
 * PATCH /api/project-invites — Accept or decline an invite
 * Body: { inviteId, action: 'accept' | 'decline' }
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { inviteId, action } = body;
  if (!inviteId || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'inviteId and action (accept|decline) required' }, { status: 400 });
  }

  const invite = await prisma.projectInvite.findUnique({ where: { id: inviteId } });
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

  // Authorization: either the direct invitee, or the owner of the federated connection
  let authorized = invite.inviteeId === userId;
  if (!authorized && invite.connectionId) {
    const conn = await prisma.connection.findFirst({
      where: { id: invite.connectionId, requesterId: userId },
    });
    if (conn) authorized = true;
  }
  if (!authorized) return NextResponse.json({ error: 'Not your invite' }, { status: 403 });

  if (invite.status !== 'pending') return NextResponse.json({ error: `Invite already ${invite.status}` }, { status: 400 });

  if (action === 'accept') {
    // Accept: update invite, add as project member
    await prisma.$transaction(async (tx: any) => {
      await tx.projectInvite.update({
        where: { id: inviteId },
        data: { status: 'accepted', acceptedAt: new Date() },
      });

      if (invite.connectionId) {
        // Federated member — add via connectionId
        const existingFed = await tx.projectMember.findFirst({
          where: { projectId: invite.projectId, connectionId: invite.connectionId },
        });
        if (!existingFed) {
          await tx.projectMember.create({
            data: {
              projectId: invite.projectId,
              userId, // Also set the local user who accepted
              connectionId: invite.connectionId,
              role: invite.role,
            },
          });
        }
      } else {
        // Local member — add via userId
        const existing = await tx.projectMember.findUnique({
          where: { projectId_userId: { projectId: invite.projectId, userId } },
        });
        if (!existing) {
          await tx.projectMember.create({
            data: {
              projectId: invite.projectId,
              userId,
              role: invite.role,
            },
          });
        }
      }
    });

    // Fetch project name for notifications
    const project = await prisma.project.findUnique({ where: { id: invite.projectId }, select: { name: true } });
    const projectName = project?.name || 'a project';
    const userName = (session.user as any).name || (session.user as any).email;

    // Notify accepter
    logActivity({ userId, action: 'project_invite_accepted', summary: `Joined project "${projectName}"`, actor: 'user', metadata: { projectId: invite.projectId, inviteId } });
    // Notify inviter — both activity log AND comms message so their Divi surfaces it
    if (invite.inviterId) {
      logActivity({ userId: invite.inviterId, action: 'project_member_joined', summary: `${userName} accepted your invite to "${projectName}"`, actor: 'system', metadata: { projectId: invite.projectId, inviteId, newMemberId: userId } });
      // Fire comms notification so the requesting Divi knows
      await prisma.commsMessage.create({
        data: {
          sender: 'system',
          content: `✅ ${userName} accepted your invite to project "${projectName}" and is now a member.`,
          state: 'new',
          priority: 'normal',
          userId: invite.inviterId,
          metadata: JSON.stringify({ type: 'project_invite_accepted', projectId: invite.projectId, inviteId, newMemberId: userId }),
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'Invite accepted — you are now a project member.' });
  } else {
    // Decline
    await prisma.projectInvite.update({
      where: { id: inviteId },
      data: { status: 'declined', declinedAt: new Date() },
    });

    const project = await prisma.project.findUnique({ where: { id: invite.projectId }, select: { name: true } });
    const declineName = (session.user as any).name || (session.user as any).email;
    logActivity({ userId, action: 'project_invite_declined', summary: `Declined invite to "${project?.name || 'a project'}"`, actor: 'user', metadata: { projectId: invite.projectId, inviteId } });
    // Notify inviter via comms
    if (invite.inviterId) {
      await prisma.commsMessage.create({
        data: {
          sender: 'system',
          content: `❌ ${declineName} declined your invite to project "${project?.name || 'a project'}".`,
          state: 'new',
          priority: 'normal',
          userId: invite.inviterId,
          metadata: JSON.stringify({ type: 'project_invite_declined', projectId: invite.projectId, inviteId }),
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'Invite declined.' });
  }
}
