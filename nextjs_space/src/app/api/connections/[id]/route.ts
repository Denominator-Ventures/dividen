export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { withTelemetry } from '@/lib/telemetry';

// PATCH /api/connections/[id] — update connection (accept, block, permissions, nickname)
async function _PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { id } = params;

    const connection = await prisma.connection.findUnique({ where: { id } });
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Must be requester or accepter
    if (connection.requesterId !== userId && connection.accepterId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const data: any = {};

    // Accept connection
    // For local connections: only the accepter can accept
    // For federated inbound connections: the local user is requesterId (accepterId is null),
    // so the requester accepts because they are the local recipient
    const canAccept = connection.isFederated
      ? (connection.requesterId === userId && !connection.accepterId)
      : (connection.accepterId === userId);

    if (body.status === 'active' && canAccept && connection.status === 'pending') {
      data.status = 'active';
      data.peerNickname = body.peerNickname || (session.user as any).name || null;

      if (connection.isFederated) {
        // Notify the remote instance that their connection request was accepted
        if (connection.peerInstanceUrl && connection.federationToken) {
          try {
            const fedConfig = await prisma.federationConfig.findFirst();
            const instanceUrl = fedConfig?.instanceUrl || process.env.NEXTAUTH_URL || '';
            await fetch(`${connection.peerInstanceUrl}/api/federation/connect/accept`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Federation-Token': connection.federationToken,
              },
              body: JSON.stringify({
                connectionId: id,
                acceptedByEmail: (session.user as any).email,
                acceptedByName: (session.user as any).name,
                instanceUrl,
              }),
            });
          } catch (fedErr) {
            console.warn('Failed to notify remote instance of acceptance:', fedErr);
          }
        }
      } else {
        // Notify the requester (local connection)
        await prisma.commsMessage.create({
          data: {
            sender: 'system',
            content: `${(session.user as any).name || (session.user as any).email} accepted your connection request! Your agents can now communicate.`,
            state: 'new',
            priority: 'normal',
            userId: connection.requesterId,
            metadata: JSON.stringify({ type: 'connection_accepted', connectionId: id }),
          },
        });
      }
    }

    // Decline
    const canDecline = connection.isFederated
      ? (connection.requesterId === userId && !connection.accepterId)
      : (connection.accepterId === userId);

    if (body.status === 'declined' && canDecline && connection.status === 'pending') {
      data.status = 'declined';
    }

    // Block (either party)
    if (body.status === 'blocked') {
      data.status = 'blocked';
    }

    // Unblock → reactivate
    if (body.status === 'active' && connection.status === 'blocked') {
      data.status = 'active';
    }

    // Update permissions
    if (body.permissions) {
      data.permissions = typeof body.permissions === 'string' ? body.permissions : JSON.stringify(body.permissions);
    }

    // Update nickname
    if (body.nickname !== undefined) {
      if (connection.requesterId === userId) {
        data.nickname = body.nickname;
      } else {
        data.peerNickname = body.nickname;
      }
    }

    // Handle new relationship context fields
    if (body.notes !== undefined) {
      data.notes = body.notes;
    }
    if (body.connectionTags !== undefined) {
      data.connectionTags = typeof body.connectionTags === 'string' ? body.connectionTags : JSON.stringify(body.connectionTags);
    }
    if (body.context !== undefined) {
      data.context = body.context;
    }
    if (body.relationshipType !== undefined) {
      data.relationshipType = body.relationshipType;
    }
    if (body.firstMetAt !== undefined) {
      data.firstMetAt = body.firstMetAt ? new Date(body.firstMetAt) : null;
    }
    if (body.strength !== undefined) {
      data.strength = body.strength;
    }

    const updated = await prisma.connection.update({
      where: { id },
      data,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        accepter: { select: { id: true, name: true, email: true } },
        _count: { select: { relays: true } },
      },
    });

    // Fire-and-forget: link CRM contacts when connection becomes active
    // Only for local connections where both users exist
    if (data.status === 'active' && updated.requester && updated.accepter) {
      import('@/lib/contact-platform-bridge').then(({ linkContactsOnConnection }) => {
        linkContactsOnConnection(
          updated.requester!.id, updated.requester!.email,
          updated.accepter!.id, updated.accepter!.email
        ).catch(() => {});
      });
    }

    // For federated connections, create a CRM contact for the remote user
    if (data.status === 'active' && updated.isFederated && updated.peerUserEmail) {
      (async () => {
        try {
          const existingContact = await prisma.contact.findFirst({
            where: { userId: updated.requesterId, email: updated.peerUserEmail! },
          });
          if (!existingContact) {
            await prisma.contact.create({
              data: {
                userId: updated.requesterId,
                name: updated.peerUserName || updated.peerUserEmail!,
                email: updated.peerUserEmail!,
                source: 'federation',
                enrichedData: JSON.stringify({
                  isFederated: true,
                  instanceUrl: updated.peerInstanceUrl,
                  connectionId: updated.id,
                }),
              },
            });
          }
        } catch {}
      })();
    }

    // ── Activity logging for notification feed ──────────────────────────
    const peerLabel = updated.isFederated
      ? (updated.peerUserName || updated.peerUserEmail || 'federated user')
      : (updated.requesterId === userId
        ? (updated.accepter?.name || updated.accepter?.email || 'user')
        : (updated.requester?.name || updated.requester?.email || 'user'));

    if (data.status === 'active') {
      // Notify the accepting user
      logActivity({ userId, action: 'connection_accepted', summary: `Accepted connection with ${peerLabel}`, actor: 'user', metadata: { connectionId: id, federated: updated.isFederated } });
      // Notify the other party (for local connections)
      if (!updated.isFederated) {
        const otherUserId = updated.requesterId === userId ? updated.accepterId : updated.requesterId;
        if (otherUserId) {
          logActivity({ userId: otherUserId, action: 'connection_accepted', summary: `${(session.user as any).name || (session.user as any).email} accepted your connection request`, actor: 'system', metadata: { connectionId: id } });
        }
      }
    } else if (data.status === 'declined') {
      logActivity({ userId, action: 'connection_declined', summary: `Declined connection from ${peerLabel}`, actor: 'user', metadata: { connectionId: id } });
    } else if (data.status === 'blocked') {
      logActivity({ userId, action: 'connection_blocked', summary: `Blocked connection with ${peerLabel}`, actor: 'user', metadata: { connectionId: id } });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PATCH /api/connections/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update connection' }, { status: 500 });
  }
}

// DELETE /api/connections/[id] — remove a connection
async function _DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { id } = params;

    const connection = await prisma.connection.findUnique({ where: { id } });
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (connection.requesterId !== userId && connection.accepterId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.connection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/connections/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete connection' }, { status: 500 });
  }
}

export const PATCH = withTelemetry(_PATCH);
export const DELETE = withTelemetry(_DELETE);
