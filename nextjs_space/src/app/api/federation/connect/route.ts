export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

// POST /api/federation/connect — receive a connection request from a remote instance
export async function POST(req: NextRequest) {
  try {
    // Check federation config
    const fedConfig = await prisma.federationConfig.findFirst({ where: { allowInbound: true }, orderBy: { updatedAt: 'desc' } });
    if (!fedConfig) {
      console.warn('[federation/connect] Rejected: no allowInbound config');
      return NextResponse.json({ error: 'This instance does not accept inbound federation requests' }, { status: 403 });
    }

    const body = await req.json();
    console.log('[federation/connect] Inbound request:', JSON.stringify({ fromInstanceUrl: body.fromInstanceUrl, fromUserEmail: body.fromUserEmail, toUserEmail: body.toUserEmail }));
    const {
      fromInstanceUrl,
      fromInstanceName,
      fromUserEmail,
      fromUserName,
      toUserEmail,
      federationToken,
      connectionId: remoteConnectionId,
    } = body;

    if (!fromInstanceUrl || !fromUserEmail || !toUserEmail || !federationToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check allowlist if in allowlist mode
    if (fedConfig.federationMode === 'allowlist') {
      const knownInstance = await prisma.instanceRegistry.findUnique({
        where: { baseUrl: fromInstanceUrl },
      });
      if (!knownInstance || !knownInstance.isActive) {
        return NextResponse.json({ error: 'Instance not in allowlist' }, { status: 403 });
      }
    }

    if (fedConfig.federationMode === 'closed') {
      return NextResponse.json({ error: 'This instance is closed to federation' }, { status: 403 });
    }

    // Find the local target user
    const targetUser = await prisma.user.findUnique({ where: { email: toUserEmail } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found on this instance' }, { status: 404 });
    }

    // Duplicate guard: check for existing connection from same peer
    const existingConn = await prisma.connection.findFirst({
      where: {
        isFederated: true,
        peerInstanceUrl: fromInstanceUrl,
        peerUserEmail: fromUserEmail,
        requesterId: targetUser.id,
        status: { in: ['active', 'pending'] },
      },
    });
    if (existingConn) {
      console.log('[federation/connect] Duplicate guard: existing connection', existingConn.id, existingConn.status);
      return NextResponse.json({ success: true, connectionId: existingConn.id, status: existingConn.status, message: 'Connection already exists' });
    }

    // Create the connection locally (from the remote user's perspective)
    const connection = await prisma.connection.create({
      data: {
        requesterId: targetUser.id, // The local user is the one receiving
        accepterId: null,
        status: fedConfig.requireApproval ? 'pending' : 'active',
        isFederated: true,
        peerInstanceUrl: fromInstanceUrl,
        peerUserEmail: fromUserEmail,
        peerUserName: fromUserName || null,
        federationToken,
        nickname: fromUserName || fromUserEmail,
        permissions: JSON.stringify({ trustLevel: 'supervised', scopes: [] }),
      },
    });

    // Notify the local user
    await prisma.commsMessage.create({
      data: {
        sender: 'system',
        content: `🌐 ${fromUserName || fromUserEmail} from ${fromInstanceName || fromInstanceUrl} wants to connect with you (federated). Go to Connections to accept or decline.`,
        state: 'new',
        priority: 'normal',
        userId: targetUser.id,
        metadata: JSON.stringify({
          type: 'federation_connection_request',
          connectionId: connection.id,
          remoteConnectionId,
          fromInstanceUrl,
        }),
      },
    });

    // If auto-accepted (requireApproval=false), fire acceptance callback to the requesting instance
    if (!fedConfig.requireApproval && connection.status === 'active') {
      const instanceUrl = fedConfig.instanceUrl || process.env.NEXTAUTH_URL || '';
      try {
        await fetch(`${fromInstanceUrl.replace(/\/$/, '')}/api/federation/connect/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Federation-Token': federationToken,
          },
          body: JSON.stringify({
            connectionId: connection.id,
            acceptedByEmail: targetUser.email,
            acceptedByName: targetUser.name,
            instanceUrl,
          }),
          signal: AbortSignal.timeout(10000),
        });
        console.log(`[federation/connect] Auto-accept callback sent to ${fromInstanceUrl}`);
      } catch (cbErr: any) {
        console.warn(`[federation/connect] Auto-accept callback to ${fromInstanceUrl} failed:`, cbErr?.message);
      }
    }

    // Register the instance if not known
    await prisma.instanceRegistry.upsert({
      where: { baseUrl: fromInstanceUrl },
      update: { lastSeenAt: new Date(), name: fromInstanceName || fromInstanceUrl },
      create: {
        name: fromInstanceName || fromInstanceUrl,
        baseUrl: fromInstanceUrl,
        apiKey: federationToken,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });

    // Log for the local target user
    await logActivity({
      userId: targetUser.id,
      action: 'federation_connection_request',
      summary: `🌐 Federated connection request from ${fromUserName || fromUserEmail} at ${fromInstanceName || fromInstanceUrl}`,
      metadata: { connectionId: connection.id, fromInstanceUrl, fromUserEmail },
    }).catch(() => {});

    return NextResponse.json({ success: true, connectionId: connection.id });
  } catch (error: any) {
    console.error('POST /api/federation/connect error:', error);
    return NextResponse.json({ error: error.message || 'Federation connection failed' }, { status: 500 });
  }
}
