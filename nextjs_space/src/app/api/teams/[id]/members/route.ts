export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/teams/:id/members — add a member (local user or federated connection)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Check caller is owner/admin
    const callerMembership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: { in: ['owner', 'admin'] } },
    });
    if (!callerMembership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const body = await req.json();
    const { email, connectionId, role } = body;

    if (connectionId) {
      // Federated member via connection
      const connection = await prisma.connection.findFirst({
        where: { id: connectionId, status: 'active', isFederated: true },
      });
      if (!connection) return NextResponse.json({ error: 'Connection not found or not active' }, { status: 404 });

      const member = await prisma.teamMember.create({
        data: {
          teamId: params.id,
          connectionId,
          role: role || 'member',
        },
        include: { connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true } } },
      });
      return NextResponse.json(member, { status: 201 });
    }

    if (!email) return NextResponse.json({ error: 'Email or connectionId required' }, { status: 400 });

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Check not already a member
    const existing = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId: targetUser.id },
    });
    if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 });

    const member = await prisma.teamMember.create({
      data: {
        teamId: params.id,
        userId: targetUser.id,
        role: role || 'member',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/teams/:id/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/teams/:id/members — remove a member
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const callerMembership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: { in: ['owner', 'admin'] } },
    });
    if (!callerMembership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 });

    // Cannot remove the owner
    const target = await prisma.teamMember.findFirst({ where: { id: memberId, teamId: params.id } });
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    if (target.role === 'owner') return NextResponse.json({ error: 'Cannot remove the team owner' }, { status: 400 });

    await prisma.teamMember.delete({ where: { id: memberId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/teams/:id/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
