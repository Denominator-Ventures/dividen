export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/projects — list projects for current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    const status = searchParams.get('status');

    const where: any = {
      OR: [
        { createdById: userId },
        { members: { some: { userId } } },
        // Also include projects from teams the user is in
        { team: { members: { some: { userId } } } },
      ],
    };
    if (teamId) where.teamId = teamId;
    if (status) where.status = status;

    const projects = await prisma.project.findMany({
      where,
      include: {
        team: { select: { id: true, name: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true } },
          },
        },
        _count: { select: { kanbanCards: true, queueItems: true, relays: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/projects — create a new project
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const { name, description, teamId, color } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    // If teamId, verify user is in the team
    if (teamId) {
      const membership = await prisma.teamMember.findFirst({ where: { teamId, userId } });
      if (!membership) return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description || null,
        teamId: teamId || null,
        color: color || null,
        createdById: userId,
        members: {
          create: { userId, role: 'lead' },
        },
      },
      include: {
        team: { select: { id: true, name: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
