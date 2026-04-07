export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/relays — list relays for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const direction = searchParams.get('direction');
    const connectionId = searchParams.get('connectionId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {
      OR: [
        { fromUserId: userId },
        { toUserId: userId },
      ],
    };
    if (status) where.status = status;
    if (direction) {
      // If viewing "inbound", show relays TO this user
      if (direction === 'inbound') {
        where.OR = [{ toUserId: userId }];
      } else {
        where.OR = [{ fromUserId: userId }];
      }
    }
    if (connectionId) where.connectionId = connectionId;

    const relays = await prisma.agentRelay.findMany({
      where,
      include: {
        connection: {
          include: {
            requester: { select: { id: true, name: true, email: true } },
            accepter: { select: { id: true, name: true, email: true } },
          },
        },
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return NextResponse.json(relays);
  } catch (error: any) {
    console.error('GET /api/relays error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch relays' }, { status: 500 });
  }
}

// POST /api/relays — create a new relay (send a request to a connection)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const body = await req.json();

    const { connectionId, type, intent, subject, payload, priority, dueDate, parentRelayId } = body;

    if (!connectionId || !type || !intent || !subject) {
      return NextResponse.json({ error: 'connectionId, type, intent, and subject are required' }, { status: 400 });
    }

    // Verify the connection exists and is active
    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }
    if (connection.status !== 'active') {
      return NextResponse.json({ error: 'Connection is not active' }, { status: 400 });
    }
    if (connection.requesterId !== userId && connection.accepterId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Determine the receiver
    const toUserId = connection.requesterId === userId ? connection.accepterId : connection.requesterId;

    const relay = await prisma.agentRelay.create({
      data: {
        connectionId,
        fromUserId: userId,
        toUserId: connection.isFederated ? null : toUserId,
        direction: 'outbound',
        type: type || 'request',
        intent: intent || 'custom',
        subject,
        payload: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null,
        status: 'pending',
        priority: priority || 'normal',
        dueDate: dueDate ? new Date(dueDate) : null,
        parentRelayId: parentRelayId || null,
        peerInstanceUrl: connection.isFederated ? connection.peerInstanceUrl : null,
      },
      include: {
        connection: {
          include: {
            requester: { select: { id: true, name: true, email: true } },
            accepter: { select: { id: true, name: true, email: true } },
          },
        },
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
      },
    });

    // For local connections, create a comms message for the receiver and mark relay as delivered
    if (!connection.isFederated && toUserId) {
      const senderName = (session.user as any).name || (session.user as any).email || 'Someone';
      await prisma.commsMessage.create({
        data: {
          sender: 'system',
          content: `📡 Relay from ${senderName}: ${subject}`,
          state: 'new',
          priority: priority || 'normal',
          userId: toUserId,
          metadata: JSON.stringify({ type: 'agent_relay', relayId: relay.id, intent }),
        },
      });

      await prisma.agentRelay.update({
        where: { id: relay.id },
        data: { status: 'delivered' },
      });
    }

    // For federated connections, forward to remote instance
    if (connection.isFederated && connection.peerInstanceUrl) {
      try {
        await fetch(`${connection.peerInstanceUrl}/api/federation/relay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Federation-Token': connection.federationToken || '',
          },
          body: JSON.stringify({
            connectionId: connection.id,
            relayId: relay.id,
            fromUserEmail: (session.user as any).email,
            fromUserName: (session.user as any).name,
            toUserEmail: connection.peerUserEmail,
            type,
            intent,
            subject,
            payload,
            priority,
            dueDate,
          }),
        });

        await prisma.agentRelay.update({
          where: { id: relay.id },
          data: { status: 'delivered' },
        });
      } catch (fedErr) {
        console.warn('Failed to forward relay to remote instance:', fedErr);
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'relay_sent',
        actor: 'user',
        summary: `Sent ${intent} relay: "${subject}"`,
        metadata: JSON.stringify({ relayId: relay.id, connectionId, intent }),
        userId,
      },
    });

    return NextResponse.json(relay, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/relays error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create relay' }, { status: 500 });
  }
}
