export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

// POST /api/projects/:id/members — add a member
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const callerMembership = await prisma.projectMember.findFirst({
      where: { projectId: params.id, userId, role: { in: ['lead', 'contributor'] } },
    });
    if (!callerMembership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const body = await req.json();
    const { email, connectionId, role } = body;

    const project = await prisma.project.findUnique({ where: { id: params.id }, select: { name: true } });
    const projectName = project?.name || 'a project';

    if (connectionId) {
      // Federated member via connection
      const connection = await prisma.connection.findFirst({
        where: { id: connectionId, status: 'active' },
      });
      if (!connection) return NextResponse.json({ error: 'Connection not found or not active' }, { status: 404 });

      const member = await prisma.projectMember.create({
        data: {
          projectId: params.id,
          connectionId,
          role: role || 'contributor',
        },
        include: { connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true } } },
      });

      logActivity({ userId, action: 'project_member_added', summary: `Added ${connection.peerUserName || connection.peerUserEmail || 'federated user'} to "${projectName}"`, actor: 'user', metadata: { projectId: params.id, connectionId, federated: true } });

      return NextResponse.json(member, { status: 201 });
    }

    if (!email) return NextResponse.json({ error: 'Email or connectionId required' }, { status: 400 });

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const existing = await prisma.projectMember.findFirst({
      where: { projectId: params.id, userId: targetUser.id },
    });
    if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 });

    const member = await prisma.projectMember.create({
      data: {
        projectId: params.id,
        userId: targetUser.id,
        role: role || 'contributor',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Activity logs for both parties
    logActivity({ userId, action: 'project_member_added', summary: `Added ${targetUser.name || targetUser.email} to "${projectName}"`, actor: 'user', metadata: { projectId: params.id, memberId: targetUser.id } });
    logActivity({ userId: targetUser.id, action: 'project_member_joined', summary: `You were added to project "${projectName}"`, actor: 'system', metadata: { projectId: params.id, addedBy: userId } });

    // Queue notification for the added member
    await prisma.queueItem.create({
      data: {
        type: 'notification',
        title: `📋 Added to project: ${projectName}`,
        description: `${(session.user as any).name || 'Someone'} added you to "${projectName}" as ${role || 'contributor'}.`,
        priority: 'medium',
        status: 'ready',
        source: 'system',
        userId: targetUser.id,
        projectId: params.id,
        metadata: JSON.stringify({ type: 'project_member_added' }),
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/projects/:id/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/projects/:id/members — remove a member
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const callerMembership = await prisma.projectMember.findFirst({
      where: { projectId: params.id, userId, role: 'lead' },
    });
    if (!callerMembership) return NextResponse.json({ error: 'Only lead can remove members' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 });

    const target = await prisma.projectMember.findFirst({ where: { id: memberId, projectId: params.id } });
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    if (target.role === 'lead' && target.userId === userId) {
      return NextResponse.json({ error: 'Cannot remove yourself as lead' }, { status: 400 });
    }

    await prisma.projectMember.delete({ where: { id: memberId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/projects/:id/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
