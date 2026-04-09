export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/teams — list teams for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true } },
          },
        },
        _count: { select: { projects: true, queueItems: true, relays: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(teams);
  } catch (error: any) {
    console.error('GET /api/teams error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/teams — create a new team
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const { name, description, avatar } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description || null,
        avatar: avatar || null,
        createdById: userId,
        members: {
          create: { userId, role: 'owner' },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/teams error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
