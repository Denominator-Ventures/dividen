export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/invites/[token]/accept — accept an invitation (creates a connection)
// Called after a user signs up or logs in with a pending invite
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized — sign up or log in first' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const userEmail = (session.user as any).email;

    const invite = await prisma.invitation.findUnique({
      where: { token: params.token },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: `Invitation already ${invite.status}` }, { status: 410 });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invite.id },
        data: { status: 'expired' },
      });
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    // Cannot accept own invitation
    if (invite.inviterId === userId) {
      return NextResponse.json({ error: 'Cannot accept your own invitation' }, { status: 400 });
    }

    // Check if connection already exists
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: invite.inviterId, accepterId: userId },
          { requesterId: userId, accepterId: invite.inviterId },
        ],
      },
    });

    if (existingConnection) {
      // Mark invite as accepted even if connection already exists
      await prisma.invitation.update({
        where: { id: invite.id },
        data: { status: 'accepted', acceptedAt: new Date() },
      });
      return NextResponse.json({ success: true, alreadyConnected: true, connectionId: existingConnection.id });
    }

    // Determine if this is a cross-instance invite
    const isCrossInstance = invite.sourceInstance &&
      invite.sourceInstance !== (process.env.NEXTAUTH_URL || '');

    let connection;

    if (isCrossInstance) {
      // Federated connection: the inviter is on a different instance
      connection = await prisma.connection.create({
        data: {
          requesterId: userId, // Local user
          status: 'active', // Auto-accept since they signed up via invite
          nickname: invite.inviterName || invite.inviterEmail || 'Remote User',
          isFederated: true,
          peerInstanceUrl: invite.sourceInstance!,
          peerUserEmail: invite.inviterEmail,
          peerUserName: invite.inviterName,
          permissions: JSON.stringify({ trustLevel: 'supervised', scopes: ['relay', 'task', 'project', 'ambient'] }),
        },
      });
    } else {
      // Local connection: both users are on this instance
      connection = await prisma.connection.create({
        data: {
          requesterId: invite.inviterId,
          accepterId: userId,
          status: 'active', // Auto-accept since they signed up via invite
          nickname: invite.inviteeName || userEmail,
          peerNickname: invite.inviterName || invite.inviterEmail,
          permissions: JSON.stringify({ trustLevel: 'supervised', scopes: ['relay', 'task', 'project', 'ambient'] }),
        },
      });

      // Notify the inviter
      await prisma.commsMessage.create({
        data: {
          sender: 'system',
          content: `${(session.user as any).name || userEmail} accepted your invitation and is now connected with you!`,
          state: 'new',
          priority: 'normal',
          userId: invite.inviterId,
          metadata: JSON.stringify({ type: 'invitation_accepted', connectionId: connection.id, invitationId: invite.id }),
        },
      });
    }

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      federated: !!isCrossInstance,
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/invites/[token]/accept error:', error);
    return NextResponse.json({ error: error.message || 'Failed to accept invitation' }, { status: 500 });
  }
}
