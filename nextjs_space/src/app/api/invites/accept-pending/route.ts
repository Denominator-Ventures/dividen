export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/invites/accept-pending — auto-accept any pending invites for the logged-in user's email
// Called after login/signup to pick up any invitations
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const userEmail = ((session.user as any).email || '').toLowerCase();

    if (!userEmail) {
      return NextResponse.json({ accepted: 0 });
    }

    // Find all pending invites for this email
    const pendingInvites = await prisma.invitation.findMany({
      where: {
        inviteeEmail: userEmail,
        status: 'pending',
      },
    });

    let accepted = 0;

    for (const invite of pendingInvites) {
      // Skip expired
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        await prisma.invitation.update({
          where: { id: invite.id },
          data: { status: 'expired' },
        });
        continue;
      }

      // Skip self-invites
      if (invite.inviterId === userId) continue;

      // Check existing connection
      const existing = await prisma.connection.findFirst({
        where: {
          OR: [
            { requesterId: invite.inviterId, accepterId: userId },
            { requesterId: userId, accepterId: invite.inviterId },
          ],
        },
      });

      if (!existing) {
        const isCrossInstance = invite.sourceInstance &&
          invite.sourceInstance !== (process.env.NEXTAUTH_URL || '');

        if (isCrossInstance) {
          await prisma.connection.create({
            data: {
              requesterId: userId,
              status: 'active',
              nickname: invite.inviterName || invite.inviterEmail || 'Remote User',
              isFederated: true,
              peerInstanceUrl: invite.sourceInstance!,
              peerUserEmail: invite.inviterEmail,
              peerUserName: invite.inviterName,
              permissions: JSON.stringify({ trustLevel: 'supervised', scopes: ['relay', 'task', 'project', 'ambient'] }),
            },
          });
        } else {
          const connection = await prisma.connection.create({
            data: {
              requesterId: invite.inviterId,
              accepterId: userId,
              status: 'active',
              nickname: invite.inviteeName || userEmail,
              peerNickname: invite.inviterName || invite.inviterEmail,
              permissions: JSON.stringify({ trustLevel: 'supervised', scopes: ['relay', 'task', 'project', 'ambient'] }),
            },
          });

          await prisma.commsMessage.create({
            data: {
              sender: 'system',
              content: `${(session.user as any).name || userEmail} accepted your invitation and is now connected with you!`,
              state: 'new',
              priority: 'normal',
              userId: invite.inviterId,
              metadata: JSON.stringify({ type: 'invitation_accepted', connectionId: connection.id }),
            },
          });
        }

        accepted++;
      }

      await prisma.invitation.update({
        where: { id: invite.id },
        data: { status: 'accepted', acceptedAt: new Date() },
      });
    }

    return NextResponse.json({ accepted, total: pendingInvites.length });
  } catch (error: any) {
    console.error('POST /api/invites/accept-pending error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
