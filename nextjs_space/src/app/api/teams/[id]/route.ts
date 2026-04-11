export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/teams/:id — get team details
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const team = await prisma.team.findFirst({
      where: {
        id: params.id,
        OR: [{ createdById: userId }, { members: { some: { userId } } }],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true, isFederated: true } },
          },
        },
        projects: {
          select: { id: true, name: true, status: true, color: true, _count: { select: { members: true, kanbanCards: true } } },
          orderBy: { updatedAt: 'desc' },
        },
        _count: { select: { queueItems: true, relays: true, followers: true } },
        subscription: true,
        billing: true,
      },
    });

    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    return NextResponse.json(team);
  } catch (error: any) {
    console.error('GET /api/teams/:id error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/teams/:id — update team
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Check membership with owner/admin role
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: { in: ['owner', 'admin'] } },
    });
    if (!membership) return NextResponse.json({ error: 'Not authorized to edit this team' }, { status: 403 });

    const body = await req.json();
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.avatar !== undefined) data.avatar = body.avatar;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    // Network entity fields
    if (body.type !== undefined) data.type = body.type;
    if (body.visibility !== undefined) data.visibility = body.visibility;
    if (body.headline !== undefined) data.headline = body.headline;
    if (body.website !== undefined) data.website = body.website;
    if (body.location !== undefined) data.location = body.location;
    if (body.industry !== undefined) data.industry = body.industry;
    if (body.foundedAt !== undefined) data.foundedAt = body.foundedAt ? new Date(body.foundedAt) : null;

    const team = await prisma.team.update({
      where: { id: params.id },
      data,
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });

    return NextResponse.json(team);
  } catch (error: any) {
    console.error('PUT /api/teams/:id error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/teams/:id — delete team
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: 'owner' },
    });
    if (!membership) return NextResponse.json({ error: 'Only team owner can delete' }, { status: 403 });

    await prisma.team.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/teams/:id error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
