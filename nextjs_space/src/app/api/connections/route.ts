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

      // Check for existing federated connection to same peer
      const existingFed = await prisma.connection.findFirst({
        where: {
          requesterId: userId,
          isFederated: true,
          peerInstanceUrl,
          peerUserEmail,
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          accepter: { select: { id: true, name: true, email: true } },
        },
      });
      if (existingFed) {
        if (existingFed.status === 'active') {
          return NextResponse.json({ error: 'Already connected to this user', existing: existingFed }, { status: 409 });
        }
        // Re-activate a pending/stale connection and re-send the federation request
        const connection = await prisma.connection.update({
          where: { id: existingFed.id },
          data: {
            status: 'pending',
            nickname: nickname || peerUserName || peerUserEmail,
            federationToken: crypto.randomBytes(32).toString('hex'),
            updatedAt: new Date(),
          },
          include: {
            requester: { select: { id: true, name: true, email: true } },
            accepter: { select: { id: true, name: true, email: true } },
          },
        });

        // Re-send federation request
        try {
          const fedConfig = await prisma.federationConfig.findFirst({ where: { allowOutbound: true, instanceUrl: { not: '' } }, orderBy: { updatedAt: 'desc' } });
          const instanceUrl = fedConfig?.instanceUrl || process.env.NEXTAUTH_URL || '';
          const instanceName = fedConfig?.instanceName || 'DiviDen';
          const requesterName = (session.user as any).name || (session.user as any).email;
          const fedResponse = await fetch(`${peerInstanceUrl}/api/federation/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromInstanceUrl: instanceUrl,
              fromInstanceName: instanceName,
              fromUserEmail: (session.user as any).email,
              fromUserName: requesterName,
              toUserEmail: peerUserEmail,
              federationToken: connection.federationToken,
              connectionId: connection.id,
            }),
          });
          if (fedResponse.ok) {
            const fedData = await fedResponse.json().catch(() => ({}));
            if (fedData.connectionId) {
              await prisma.connection.update({ where: { id: connection.id }, data: { status: 'active' } });
            }
            console.log(`[federation/connect] Re-sent, remote accepted, connection ${connection.id} activated`);
          } else {
            const errBody = await fedResponse.text().catch(() => 'no body');
            console.error(`[federation/connect] Re-send remote rejected: ${fedResponse.status} — ${errBody}`);
          }
        } catch (fedErr: any) {
          console.error('[federation/connect] Re-send failed:', fedErr.message);
        }

        logActivity({ userId, action: 'connection_resent', summary: `Re-sent federated connection request to ${peerUserName || peerUserEmail} on ${peerInstanceUrl}`, actor: 'user', metadata: { connectionId: connection.id, federated: true } });
        return NextResponse.json(connection, { status: 200 });
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
          permissions: JSON.stringify({ trustLevel: 'supervised', scopes: ['relay', 'task', 'project', 'ambient'] }),
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          accepter: { select: { id: true, name: true, email: true } },
        },
      });

      // Attempt to send the connection request to the remote instance
      try {
        const fedConfig = await prisma.federationConfig.findFirst({ where: { allowOutbound: true, instanceUrl: { not: '' } }, orderBy: { updatedAt: 'desc' } });
        const instanceUrl = fedConfig?.instanceUrl || process.env.NEXTAUTH_URL || '';
        const instanceName = fedConfig?.instanceName || 'DiviDen';
        const requesterName = (session.user as any).name || (session.user as any).email;

        const fedResponse = await fetch(`${peerInstanceUrl}/api/federation/connect`, {
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
        if (!fedResponse.ok) {
          const errBody = await fedResponse.text().catch(() => 'no body');
          console.error(`[federation/connect] Remote rejected: ${fedResponse.status} — ${errBody}`);
        } else {
          // Mark connection as active if remote accepted immediately (no approval required)
          const fedData = await fedResponse.json().catch(() => ({}));
          if (fedData.connectionId) {
            await prisma.connection.update({
              where: { id: connection.id },
              data: { status: 'active' },
            });
          }
          console.log(`[federation/connect] Remote accepted, connection ${connection.id} activated`);
        }
      } catch (fedErr: any) {
        console.error('[federation/connect] Failed to notify remote instance:', fedErr.message);
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
      // If the OTHER user already sent US a pending request, auto-accept it
      if (existing.requesterId === targetUser.id && existing.accepterId === userId && existing.status === 'pending') {
        const accepted = await prisma.connection.update({
          where: { id: existing.id },
          data: { status: 'active', peerNickname: nickname || (session.user as any).name || null },
          include: {
            requester: { select: { id: true, name: true, email: true } },
            accepter: { select: { id: true, name: true, email: true } },
          },
        });

        // Notify the original requester
        await prisma.commsMessage.create({
          data: {
            sender: 'system',
            content: `${(session.user as any).name || (session.user as any).email} accepted your connection request! Your agents can now communicate.`,
            state: 'new',
            priority: 'normal',
            userId: targetUser.id,
            metadata: JSON.stringify({ type: 'connection_accepted', connectionId: existing.id }),
          },
        });

        logActivity({ userId, action: 'connection_accepted', summary: `Accepted connection with ${targetUser.name || targetUser.email} (mutual request)`, metadata: { connectionId: existing.id } });
        logActivity({ userId: targetUser.id, action: 'connection_accepted', summary: `${(session.user as any).name || (session.user as any).email} accepted your connection request`, actor: 'system', metadata: { connectionId: existing.id } });

        // Fire-and-forget: link CRM contacts
        import('@/lib/contact-platform-bridge').then(({ linkContactsOnConnection }) => {
          linkContactsOnConnection(targetUser.id, targetUser.email, userId, (session.user as any).email).catch(() => {});
        });

        return NextResponse.json(accepted, { status: 200 });
      }

      return NextResponse.json({ error: 'Connection already exists', connection: existing }, { status: 409 });
    }

    const connection = await prisma.connection.create({
      data: {
        requesterId: userId,
        accepterId: targetUser.id,
        status: 'pending',
        nickname: nickname || targetUser.name || targetUser.email,
        permissions: JSON.stringify({ trustLevel: 'supervised', scopes: ['relay', 'task', 'project', 'ambient'] }),
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
