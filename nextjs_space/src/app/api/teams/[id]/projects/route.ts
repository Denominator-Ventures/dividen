export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncTeamMembersToProject } from '@/lib/team-project-sync';
import { withTelemetry } from '@/lib/telemetry';

// POST /api/teams/:id/projects — assign a team to a project
// Body: { projectId: string }
async function _POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Caller must be team owner or admin
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: { in: ['owner', 'admin'] } },
    });
    if (!membership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const { projectId } = await req.json();
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    // Verify the project exists and the user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
        ],
      },
    });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Assign team to project
    await prisma.project.update({
      where: { id: projectId },
      data: { teamId: params.id },
    });

    // Sync all team members into the project as contributors
    const syncResult = await syncTeamMembersToProject(params.id, projectId);

    return NextResponse.json({
      success: true,
      projectId,
      teamId: params.id,
      membersAdded: syncResult.added,
      membersSkipped: syncResult.skipped,
    });
  } catch (error: any) {
    console.error('POST /api/teams/:id/projects error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/teams/:id/projects — list projects assigned to this team
async function _GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Verify membership
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId },
    });
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

    const projects = await prisma.project.findMany({
      where: { teamId: params.id },
      include: {
        _count: { select: { members: true, kanbanCards: true, queueItems: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('GET /api/teams/:id/projects error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/teams/:id/projects — unassign a team from a project
// Body: { projectId: string }
async function _DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: { in: ['owner', 'admin'] } },
    });
    if (!membership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    // Remove team assignment (keep project members intact — they were added individually too)
    await prisma.project.update({
      where: { id: projectId },
      data: { teamId: null },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/teams/:id/projects error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
export const DELETE = withTelemetry(_DELETE);
