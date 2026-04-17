export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/v2/connections — list connections (authenticated or federation token)
 * POST /api/v2/connections — handle federation connection requests (v2 protocol)
 *
 * This endpoint mirrors the v2 protocol used by newer DiviDen instances (like FVP)
 * so cross-instance connection requests land correctly.
 */

export async function GET(req: NextRequest) {
  try {
    // Auth: session or federation platform token
    const session = await getServerSession(authOptions);
    const platformToken = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!session?.user?.id && !platformToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId = session?.user?.id;
    if (!userId && platformToken) {
      // Validate platform token against instance registry
      const instance = await prisma.instanceRegistry.findFirst({
        where: { platformToken, isActive: true },
      });
      if (!instance) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Return empty for platform-level queries (platform doesn't own connections)
      return NextResponse.json({ connections: [] });
    }

    const connections = await prisma.connection.findMany({
      where: {
        OR: [{ requesterId: userId }, { accepterId: userId }],
        isFederated: true,
        status: 'active',
      },
      select: {
        id: true,
        status: true,
        peerInstanceUrl: true,
        peerUserEmail: true,
        peerUserName: true,
        nickname: true,
        peerNickname: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ connections });
  } catch (error: any) {
    console.error('GET /api/v2/connections error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[v2/connections] POST received:', JSON.stringify(body));

    // Check federation config
    const fedConfig = await prisma.federationConfig.findFirst({
      where: { allowInbound: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!fedConfig) {
      return NextResponse.json(
        { error: 'This instance does not accept inbound federation requests' },
        { status: 403 }
      );
    }
    if (fedConfig.federationMode === 'closed') {
      return NextResponse.json({ error: 'Federation is closed' }, { status: 403 });
    }

    // v2 protocol fields (same as federation/connect but may come in different shapes)
    const fromInstanceUrl = body.fromInstanceUrl || body.instanceUrl || body.sourceUrl;
    const fromInstanceName = body.fromInstanceName || body.instanceName || body.sourceName;
    const fromUserEmail = body.fromUserEmail || body.senderEmail || body.email;
    const fromUserName = body.fromUserName || body.senderName || body.name;
    const toUserEmail = body.toUserEmail || body.targetEmail || body.recipientEmail;
    const federationToken = body.federationToken || body.token;
    const remoteConnectionId = body.connectionId || body.remoteConnectionId;

    if (!fromInstanceUrl || !fromUserEmail || !toUserEmail || !federationToken) {
      return NextResponse.json(
        { error: 'Missing required fields: fromInstanceUrl, fromUserEmail, toUserEmail, federationToken' },
        { status: 400 }
      );
    }

    // Allowlist check
    if (fedConfig.federationMode === 'allowlist') {
      const knownInstance = await prisma.instanceRegistry.findUnique({
        where: { baseUrl: fromInstanceUrl },
      });
      if (!knownInstance || !knownInstance.isActive) {
        return NextResponse.json({ error: 'Instance not in allowlist' }, { status: 403 });
      }
    }

    // Find target user
    const targetUser = await prisma.user.findUnique({ where: { email: toUserEmail } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found on this instance' }, { status: 404 });
    }

    // Duplicate guard: check for existing connection from same peer
    const existing = await prisma.connection.findFirst({
      where: {
        isFederated: true,
        peerInstanceUrl: fromInstanceUrl,
        peerUserEmail: fromUserEmail,
        requesterId: targetUser.id,
        status: { in: ['active', 'pending'] },
      },
    });
    if (existing) {
      console.log('[v2/connections] Duplicate guard: existing connection', existing.id);
      return NextResponse.json({
        success: true,
        connectionId: existing.id,
        status: existing.status,
        message: 'Connection already exists',
      });
    }

    // Create connection
    const connection = await prisma.connection.create({
      data: {
        requesterId: targetUser.id,
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

    // Notify local user
    await prisma.commsMessage.create({
      data: {
        sender: 'system',
        content: `🌐 ${fromUserName || fromUserEmail} from ${fromInstanceName || fromInstanceUrl} wants to connect (federated).`,
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

    // Register instance
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

    await logActivity({
      userId: targetUser.id,
      action: 'federation_connection_request',
      summary: `🌐 Federated connection request from ${fromUserName || fromUserEmail} at ${fromInstanceName || fromInstanceUrl}`,
      metadata: { connectionId: connection.id, fromInstanceUrl, fromUserEmail },
    }).catch(() => {});

    console.log('[v2/connections] Created connection:', connection.id, 'status:', connection.status);

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      status: connection.status,
      localUserName: targetUser.name,
      localUserEmail: targetUser.email,
    });
  } catch (error: any) {
    console.error('POST /api/v2/connections error:', error);
    return NextResponse.json({ error: error.message || 'Connection request failed' }, { status: 500 });
  }
}
