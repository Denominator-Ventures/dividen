import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/integrations — list all integration accounts for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;

    const accounts = await prisma.integrationAccount.findMany({
      where: { userId },
      orderBy: [{ identity: 'asc' }, { accountIndex: 'asc' }, { service: 'asc' }],
      select: {
        id: true,
        identity: true,
        provider: true,
        service: true,
        label: true,
        emailAddress: true,
        accountIndex: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
        // Never expose tokens/passwords
      },
    });

    // Check if Google OAuth is configured (self-hosted instances need their own credentials)
    const googleOAuthAvailable = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

    return NextResponse.json({ success: true, data: accounts, googleOAuthAvailable });
  } catch (error) {
    console.error('Integrations GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch integrations' }, { status: 500 });
  }
}

// POST /api/integrations — create or update an integration account
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const body = await req.json();

    const { identity, provider, service, label, emailAddress, smtpHost, smtpPort, smtpUser, smtpPass } = body;

    if (!identity || !provider || !service) {
      return NextResponse.json({ success: false, error: 'identity, provider, and service are required' }, { status: 400 });
    }
    if (!['operator', 'agent'].includes(identity)) {
      return NextResponse.json({ success: false, error: 'identity must be operator or agent' }, { status: 400 });
    }
    if (!['email', 'calendar', 'drive'].includes(service)) {
      return NextResponse.json({ success: false, error: 'service must be email, calendar, or drive' }, { status: 400 });
    }

    // Upsert: one integration per (user, identity, service, accountIndex)
    const account = await prisma.integrationAccount.upsert({
      where: {
        userId_identity_service_accountIndex: { userId, identity, service, accountIndex: 0 },
      },
      create: {
        userId,
        identity,
        provider,
        service,
        label: label || null,
        emailAddress: emailAddress || null,
        smtpHost: smtpHost || null,
        smtpPort: smtpPort ? parseInt(smtpPort) : null,
        smtpUser: smtpUser || null,
        smtpPass: smtpPass || null,
      },
      update: {
        provider,
        label: label || undefined,
        emailAddress: emailAddress || undefined,
        smtpHost: smtpHost !== undefined ? (smtpHost || null) : undefined,
        smtpPort: smtpPort !== undefined ? (smtpPort ? parseInt(smtpPort) : null) : undefined,
        smtpUser: smtpUser !== undefined ? (smtpUser || null) : undefined,
        smtpPass: smtpPass !== undefined ? (smtpPass || null) : undefined,
        isActive: true,
      },
      select: {
        id: true,
        identity: true,
        provider: true,
        service: true,
        label: true,
        emailAddress: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: account });
  } catch (error) {
    console.error('Integrations POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save integration' }, { status: 500 });
  }
}

// DELETE /api/integrations — delete an integration account (revokes Google tokens if applicable)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const disconnectGoogle = searchParams.get('disconnectGoogle') === 'true';
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    // If disconnecting Google, revoke token and delete ALL Google integrations for this specific account (by accountIndex)
    if (disconnectGoogle) {
      const account = await prisma.integrationAccount.findFirst({
        where: { id, userId },
        select: { accessToken: true, identity: true, provider: true, accountIndex: true },
      });
      if (account?.accessToken && account.provider === 'google') {
        // Revoke at Google
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${account.accessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
        } catch (e) {
          console.warn('[integrations] Google token revoke failed (non-fatal):', e);
        }
        // Delete all services for this specific Google account (same identity + accountIndex)
        await prisma.integrationAccount.deleteMany({
          where: { userId, provider: 'google', identity: account.identity, accountIndex: account.accountIndex },
        });
      }
    } else {
      await prisma.integrationAccount.deleteMany({
        where: { id, userId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Integrations DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete integration' }, { status: 500 });
  }
}
