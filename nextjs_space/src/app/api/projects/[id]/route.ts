export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/projects/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
          { team: { members: { some: { userId } } } },
        ],
      },
      include: {
        team: { select: { id: true, name: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true, isFederated: true } },
          },
        },
        kanbanCards: {
          select: { id: true, title: true, status: true, priority: true, assignee: true, dueDate: true },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        },
        _count: { select: { kanbanCards: true, queueItems: true, relays: true } },
      },
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    return NextResponse.json(project);
  } catch (error: any) {
    console.error('GET /api/projects/:id error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/projects/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const membership = await prisma.projectMember.findFirst({
      where: { projectId: params.id, userId, role: { in: ['lead', 'contributor'] } },
    });
    if (!membership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const body = await req.json();
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) data.status = body.status;
    if (body.color !== undefined) data.color = body.color;
    if (body.teamId !== undefined) data.teamId = body.teamId || null;

    const project = await prisma.project.update({ where: { id: params.id }, data });
    return NextResponse.json(project);
  } catch (error: any) {
    console.error('PUT /api/projects/:id error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/projects/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const membership = await prisma.projectMember.findFirst({
      where: { projectId: params.id, userId, role: 'lead' },
    });
    if (!membership) return NextResponse.json({ error: 'Only project lead can delete' }, { status: 403 });

    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/projects/:id error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
