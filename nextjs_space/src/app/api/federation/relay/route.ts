export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/federation/relay — receive a relay from a remote instance
export async function POST(req: NextRequest) {
  try {
    const federationToken = req.headers.get('x-federation-token');
    if (!federationToken) {
      return NextResponse.json({ error: 'Missing federation token' }, { status: 401 });
    }

    // Check federation config
    const fedConfig = await prisma.federationConfig.findFirst();
    if (!fedConfig || !fedConfig.allowInbound) {
      return NextResponse.json({ error: 'Inbound federation disabled' }, { status: 403 });
    }

    const body = await req.json();
    const {
      connectionId: remoteConnectionId,
      relayId: remoteRelayId,
      fromUserEmail,
      fromUserName,
      toUserEmail,
      type,
      intent,
      subject,
      payload,
      priority,
      dueDate,
    } = body;

    // Find the local connection by federation token
    const connection = await prisma.connection.findFirst({
      where: {
        isFederated: true,
        federationToken,
        status: 'active',
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'No active federated connection found for this token' }, { status: 404 });
    }

    // Find the local user
    const localUser = await prisma.user.findUnique({
      where: { email: toUserEmail },
    });

    if (!localUser) {
      // Fall back to connection requester
      const fallbackUserId = connection.requesterId;
      const relay = await prisma.agentRelay.create({
        data: {
          connectionId: connection.id,
          fromUserId: fallbackUserId, // Placeholder — remote user
          toUserId: fallbackUserId,
          direction: 'inbound',
          type: type || 'request',
          intent: intent || 'custom',
          subject: subject || 'Federated relay',
          payload: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null,
          status: 'delivered',
          priority: priority || 'normal',
          dueDate: dueDate ? new Date(dueDate) : null,
          peerRelayId: remoteRelayId || null,
          peerInstanceUrl: connection.peerInstanceUrl,
        },
      });

      await prisma.commsMessage.create({
        data: {
          sender: 'system',
          content: `🌐 Relay from ${fromUserName || fromUserEmail} (${connection.peerInstanceUrl}): ${subject}`,
          state: 'new',
          priority: priority || 'normal',
          userId: fallbackUserId,
          metadata: JSON.stringify({ type: 'federated_relay', relayId: relay.id }),
        },
      });

      return NextResponse.json({ success: true, relayId: relay.id });
    }

    // Create the relay locally
    const relay = await prisma.agentRelay.create({
      data: {
        connectionId: connection.id,
        fromUserId: connection.requesterId,
        toUserId: localUser.id,
        direction: 'inbound',
        type: type || 'request',
        intent: intent || 'custom',
        subject: subject || 'Federated relay',
        payload: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null,
        status: 'delivered',
        priority: priority || 'normal',
        dueDate: dueDate ? new Date(dueDate) : null,
        peerRelayId: remoteRelayId || null,
        peerInstanceUrl: connection.peerInstanceUrl,
      },
    });

    // Notify via comms
    await prisma.commsMessage.create({
      data: {
        sender: 'system',
        content: `🌐 Relay from ${fromUserName || fromUserEmail} (${connection.peerInstanceUrl}): ${subject}`,
        state: 'new',
        priority: priority || 'normal',
        userId: localUser.id,
        metadata: JSON.stringify({ type: 'federated_relay', relayId: relay.id }),
      },
    });

    return NextResponse.json({ success: true, relayId: relay.id });
  } catch (error: any) {
    console.error('POST /api/federation/relay error:', error);
    return NextResponse.json({ error: error.message || 'Federation relay failed' }, { status: 500 });
  }
}
