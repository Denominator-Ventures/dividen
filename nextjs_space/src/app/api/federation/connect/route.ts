export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/federation/connect — receive a connection request from a remote instance
export async function POST(req: NextRequest) {
  try {
    // Check federation config
    const fedConfig = await prisma.federationConfig.findFirst();
    if (!fedConfig || !fedConfig.allowInbound) {
      return NextResponse.json({ error: 'This instance does not accept inbound federation requests' }, { status: 403 });
    }

    const body = await req.json();
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

    return NextResponse.json({ success: true, connectionId: connection.id });
  } catch (error: any) {
    console.error('POST /api/federation/connect error:', error);
    return NextResponse.json({ error: error.message || 'Federation connection failed' }, { status: 500 });
  }
}
