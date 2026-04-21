export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

async function sendInviteEmail(invite: {
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  inviteeName?: string;
  message?: string;
  token: string;
  instanceUrl: string;
}) {
  const signupUrl = `${invite.instanceUrl}/setup?invite=${invite.token}`;
  const greeting = invite.inviteeName ? `Hi ${invite.inviteeName}` : 'Hi';

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #0a0a0a; color: #f5f5f5; padding: 32px; border-radius: 12px;">
      <div style="margin-bottom: 24px;">
        <span style="font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 600; color: #f5f5f5;">DiviDen</span>
        <div style="width: 60px; height: 2px; background: #4F7CFF; border-radius: 1px; margin-top: 4px;"></div>
      </div>

      <p style="color: #a1a1a1; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
        ${greeting},
      </p>

      <p style="color: #f5f5f5; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
        <strong>${invite.inviterName}</strong> (${invite.inviterEmail}) has invited you to join DiviDen — the agentic working protocol.
      </p>

      ${invite.message ? `
      <div style="background: rgba(255,255,255,0.04); border-left: 3px solid #4F7CFF; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
        <p style="color: #a1a1a1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 6px;">Personal note</p>
        <p style="color: #f5f5f5; font-size: 14px; line-height: 1.5; margin: 0;">${invite.message}</p>
      </div>
      ` : ''}

      <p style="color: #a1a1a1; font-size: 14px; line-height: 1.6; margin: 16px 0;">
        When you join, you’ll automatically be connected with ${invite.inviterName} — your agents will be able to communicate on your behalf.
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${signupUrl}" style="display: inline-block; background: #4F7CFF; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
          Accept Invitation &amp; Join
        </a>
      </div>

      <p style="color: #666; font-size: 12px; line-height: 1.5; margin: 24px 0 0; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px;">
        This invitation expires in 14 days. If you already have a DiviDen account, <a href="${invite.instanceUrl}/login" style="color: #4F7CFF; text-decoration: none;">sign in</a> and the connection will be established automatically.
      </p>
    </div>
  `;

  try {
    const appUrl = invite.instanceUrl;
    const hostname = new URL(appUrl).hostname;

    const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: process.env.NOTIF_ID_CONNECTION_INVITATION,
        subject: `${invite.inviterName} invited you to DiviDen`,
        body: htmlBody,
        is_html: true,
        recipient_email: invite.inviteeEmail,
        sender_email: `invites@${hostname}`,
        sender_alias: 'DiviDen',
      }),
    });

    const result = await response.json();
    return { success: result.success !== false, result };
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return { success: false, error };
  }
}

// GET /api/invites — list user's sent invites
async function _GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const invites = await prisma.invitation.findMany({
      where: { inviterId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ invites });
  } catch (error: any) {
    console.error('GET /api/invites error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

// POST /api/invites — create and send an invitation
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const userName = (session.user as any).name || (session.user as any).email;
    const userEmail = (session.user as any).email;

    const body = await req.json();
    const { email, name, message, instanceUrl: targetInstance } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (email.toLowerCase() === userEmail?.toLowerCase()) {
      return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });
    }

    // Check for existing pending invite to same email from this user
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        inviterId: userId,
        inviteeEmail: email.toLowerCase(),
        status: 'pending',
      },
    });
    if (existingInvite) {
      return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 409 });
    }

    // Check if user already exists on this instance
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      // User already exists — just create a connection request instead
      const existingConnection = await prisma.connection.findFirst({
        where: {
          OR: [
            { requesterId: userId, accepterId: existingUser.id },
            { requesterId: existingUser.id, accepterId: userId },
          ],
        },
      });
      if (existingConnection) {
        return NextResponse.json({ error: 'Already connected or pending with this user', existing: true }, { status: 409 });
      }

      // Create connection request directly
      const connection = await prisma.connection.create({
        data: {
          requesterId: userId,
          accepterId: existingUser.id,
          status: 'pending',
          nickname: name || existingUser.name || existingUser.email,
          permissions: JSON.stringify({ trustLevel: 'supervised', scopes: ['relay', 'task', 'project', 'ambient'] }),
        },
      });

      // Notify them via comms
      await prisma.commsMessage.create({
        data: {
          sender: 'system',
          content: `${userName} wants to connect with you. Go to Connections to accept or decline.`,
          state: 'new',
          priority: 'normal',
          userId: existingUser.id,
          metadata: JSON.stringify({ type: 'connection_request', connectionId: connection.id }),
        },
      });

      return NextResponse.json({ success: true, existingUser: true, connectionCreated: true }, { status: 201 });
    }

    // Create the invitation
    const instanceUrl = targetInstance || process.env.NEXTAUTH_URL || '';
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    const invitation = await prisma.invitation.create({
      data: {
        inviterId: userId,
        inviterName: userName,
        inviterEmail: userEmail,
        inviteeEmail: email.toLowerCase(),
        inviteeName: name || null,
        message: message || null,
        status: 'pending',
        instanceUrl,
        sourceInstance: process.env.NEXTAUTH_URL || null,
        expiresAt,
      },
    });

    // Send the email
    const emailResult = await sendInviteEmail({
      inviterName: userName,
      inviterEmail: userEmail,
      inviteeEmail: email.toLowerCase(),
      inviteeName: name || undefined,
      message: message || undefined,
      token: invitation.token,
      instanceUrl,
    });

    // Fire-and-forget: mark CRM contact as invited
    import('@/lib/contact-platform-bridge').then(({ markContactAsInvited }) => {
      markContactAsInvited(userId, email.toLowerCase()).catch(() => {});
    });

    return NextResponse.json({
      success: true,
      invitation: { id: invitation.id, token: invitation.token, status: invitation.status },
      emailSent: emailResult.success,
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/invites error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create invitation' }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
