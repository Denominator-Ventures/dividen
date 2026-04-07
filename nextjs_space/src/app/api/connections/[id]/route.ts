export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/connections/[id] — update connection (accept, block, permissions, nickname)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Accept connection (only accepter can do this)
    if (body.status === 'active' && connection.accepterId === userId && connection.status === 'pending') {
      data.status = 'active';
      data.peerNickname = body.peerNickname || (session.user as any).name || null;

      // Notify the requester
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

    // Decline
    if (body.status === 'declined' && connection.accepterId === userId && connection.status === 'pending') {
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

    const updated = await prisma.connection.update({
      where: { id },
      data,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        accepter: { select: { id: true, name: true, email: true } },
        _count: { select: { relays: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PATCH /api/connections/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update connection' }, { status: 500 });
  }
}

// DELETE /api/connections/[id] — remove a connection
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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
