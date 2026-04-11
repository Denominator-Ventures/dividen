export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

  const where: any = type === 'sent'
    ? { inviterId: userId }
    : { inviteeId: userId };
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
  if (invite.inviteeId !== userId) return NextResponse.json({ error: 'Not your invite' }, { status: 403 });
  if (invite.status !== 'pending') return NextResponse.json({ error: `Invite already ${invite.status}` }, { status: 400 });

  if (action === 'accept') {
    // Accept: update invite, add as project member
    await prisma.$transaction(async (tx) => {
      await tx.projectInvite.update({
        where: { id: inviteId },
        data: { status: 'accepted', acceptedAt: new Date() },
      });

      // Check if already a member
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
    });

    return NextResponse.json({ success: true, message: 'Invite accepted — you are now a project member.' });
  } else {
    // Decline
    await prisma.projectInvite.update({
      where: { id: inviteId },
      data: { status: 'declined', declinedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: 'Invite declined.' });
  }
}
