export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// GET /api/connections — list all connections for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // filter by status

    const where: any = {
      OR: [
        { requesterId: userId },
        { accepterId: userId },
      ],
    };
    if (status) where.status = status;

    const connections = await prisma.connection.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        accepter: { select: { id: true, name: true, email: true } },
        _count: { select: { relays: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(connections);
  } catch (error: any) {
    console.error('GET /api/connections error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch connections' }, { status: 500 });
  }
}

// POST /api/connections — create a new connection request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const body = await req.json();

    const {
      email,          // email of the person to connect with (local)
      nickname,       // optional display name
      // Federation fields
      isFederated,
      peerInstanceUrl,
      peerUserEmail,
      peerUserName,
    } = body;

    if (isFederated) {
      // Federated connection — connect to a user on a remote instance
      if (!peerInstanceUrl || !peerUserEmail) {
        return NextResponse.json({ error: 'Remote instance URL and user email are required for federated connections' }, { status: 400 });
      }

      const federationToken = crypto.randomBytes(32).toString('hex');

      const connection = await prisma.connection.create({
        data: {
          requesterId: userId,
          status: 'pending',
          nickname: nickname || peerUserName || peerUserEmail,
          isFederated: true,
          peerInstanceUrl,
          peerUserEmail,
          peerUserName: peerUserName || null,
          federationToken,
          permissions: JSON.stringify({ trustLevel: 'supervised', scopes: [] }),
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          accepter: { select: { id: true, name: true, email: true } },
        },
      });

      // Attempt to send the connection request to the remote instance
      try {
        const fedConfig = await prisma.federationConfig.findFirst();
        const instanceUrl = fedConfig?.instanceUrl || process.env.NEXTAUTH_URL || '';
        const instanceName = fedConfig?.instanceName || 'DiviDen';
        const requesterName = (session.user as any).name || (session.user as any).email;

        await fetch(`${peerInstanceUrl}/api/federation/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromInstanceUrl: instanceUrl,
            fromInstanceName: instanceName,
            fromUserEmail: (session.user as any).email,
            fromUserName: requesterName,
            toUserEmail: peerUserEmail,
            federationToken,
            connectionId: connection.id,
          }),
        });
      } catch (fedErr) {
        console.warn('Failed to notify remote instance:', fedErr);
        // Connection still created locally — will sync when remote comes online
      }

      logActivity({ userId, action: 'connection_created', summary: `Initiated federated connection to ${peerUserName || peerUserEmail} on ${peerInstanceUrl}`, actor: 'user', metadata: { connectionId: connection.id, federated: true } });

      return NextResponse.json(connection, { status: 201 });
    }

    // Local connection
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found on this instance' }, { status: 404 });
    }
    if (targetUser.id === userId) {
      return NextResponse.json({ error: 'Cannot connect with yourself' }, { status: 400 });
    }

    // Check for existing connection
    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: userId, accepterId: targetUser.id },
          { requesterId: targetUser.id, accepterId: userId },
        ],
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Connection already exists', connection: existing }, { status: 409 });
    }

    const connection = await prisma.connection.create({
      data: {
        requesterId: userId,
        accepterId: targetUser.id,
        status: 'pending',
        nickname: nickname || targetUser.name || targetUser.email,
        permissions: JSON.stringify({ trustLevel: 'supervised', scopes: [] }),
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        accepter: { select: { id: true, name: true, email: true } },
      },
    });

    // Create a comms message for the target user
    await prisma.commsMessage.create({
      data: {
        sender: 'system',
        content: `${(session.user as any).name || (session.user as any).email} wants to connect with you. Go to Connections to accept or decline.`,
        state: 'new',
        priority: 'normal',
        userId: targetUser.id,
        metadata: JSON.stringify({ type: 'connection_request', connectionId: connection.id }),
      },
    });

    logActivity({ userId, action: 'connection_created', summary: `Connection request sent to ${targetUser.name || targetUser.email}`, metadata: { connectionId: connection.id } });

    return NextResponse.json(connection, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/connections error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create connection' }, { status: 500 });
  }
}
