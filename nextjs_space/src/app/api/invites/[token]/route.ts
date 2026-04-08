export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/invites/[token] — verify/peek at an invitation (public, no auth needed)
// Used by the signup page to show invite context
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invite = await prisma.invitation.findUnique({
      where: { token: params.token },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({
        error: invite.status === 'accepted' ? 'Invitation already accepted' : 'Invitation expired or cancelled',
        status: invite.status,
      }, { status: 410 });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invite.id },
        data: { status: 'expired' },
      });
      return NextResponse.json({ error: 'Invitation has expired', status: 'expired' }, { status: 410 });
    }

    // Return safe public info
    return NextResponse.json({
      valid: true,
      inviterName: invite.inviterName,
      inviterEmail: invite.inviterEmail,
      inviteeName: invite.inviteeName,
      inviteeEmail: invite.inviteeEmail,
      message: invite.message,
      sourceInstance: invite.sourceInstance,
    });
  } catch (error: any) {
    console.error('GET /api/invites/[token] error:', error);
    return NextResponse.json({ error: 'Failed to verify invitation' }, { status: 500 });
  }
}
