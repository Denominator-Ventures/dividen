export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/federation/connect/accept
 *
 * Callback from a remote instance when a federated connection request is accepted.
 * The remote instance calls this endpoint to notify the originating instance that
 * the connection is now active.
 *
 * Auth: X-Federation-Token header — must match the token on the originating connection.
 */
export async function POST(req: NextRequest) {
  try {
    const federationToken = req.headers.get('x-federation-token');
    if (!federationToken) {
      return NextResponse.json({ error: 'Missing federation token' }, { status: 401 });
    }

    const body = await req.json();
    const { connectionId, acceptedByEmail, acceptedByName, instanceUrl } = body;

    // Find the local connection that matches this federation token
    // The originating instance created the connection with isFederated: true
    const connection = await prisma.connection.findFirst({
      where: {
        isFederated: true,
        federationToken,
        status: 'pending',
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'No pending federated connection found for this token' },
        { status: 404 },
      );
    }

    // Activate the connection on the originating side
    await prisma.connection.update({
      where: { id: connection.id },
      data: {
        status: 'active',
        peerUserName: acceptedByName || connection.peerUserName,
        peerUserEmail: acceptedByEmail || connection.peerUserEmail,
      },
    });

    // Notify the local user that their connection was accepted
    await prisma.commsMessage.create({
      data: {
        sender: 'system',
        content: `🌐 ${acceptedByName || acceptedByEmail || 'Remote user'} accepted your federated connection request! Your agents can now communicate across instances.`,
        state: 'new',
        priority: 'normal',
        userId: connection.requesterId,
        metadata: JSON.stringify({
          type: 'federation_connection_accepted',
          connectionId: connection.id,
          instanceUrl,
        }),
      },
    });

    // Best-effort: create a CRM contact for the remote user
    if (acceptedByEmail) {
      try {
        const existing = await prisma.contact.findFirst({
          where: { userId: connection.requesterId, email: acceptedByEmail },
        });
        if (!existing) {
          await prisma.contact.create({
            data: {
              userId: connection.requesterId,
              name: acceptedByName || acceptedByEmail,
              email: acceptedByEmail,
              source: 'federation',
              enrichedData: JSON.stringify({
                isFederated: true,
                instanceUrl: connection.peerInstanceUrl,
                connectionId: connection.id,
              }),
            },
          });
        }
      } catch {}
    }

    return NextResponse.json({ success: true, connectionId: connection.id });
  } catch (error: any) {
    console.error('POST /api/federation/connect/accept error:', error);
    return NextResponse.json(
      { error: error.message || 'Federation accept callback failed' },
      { status: 500 },
    );
  }
}