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
      orderBy: [{ identity: 'asc' }, { service: 'asc' }],
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
        // Never expose tokens/passwords
      },
    });

    return NextResponse.json({ success: true, data: accounts });
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

    // Upsert: one integration per (user, identity, service)
    const account = await prisma.integrationAccount.upsert({
      where: {
        userId_identity_service: { userId, identity, service },
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

// DELETE /api/integrations — delete an integration account
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    await prisma.integrationAccount.deleteMany({
      where: { id, userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Integrations DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete integration' }, { status: 500 });
  }
}
