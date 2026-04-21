export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkTeamProjectLimit, FeatureGateError } from '@/lib/feature-gates';
import { withTelemetry } from '@/lib/telemetry';

// GET /api/projects — list projects for current user
async function _GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    const status = searchParams.get('status');

    const where: any = {
      OR: [
        // Always see projects you created or are a member of
        { createdById: userId },
        { members: { some: { userId } } },
        // "team" visibility: any team member can see the project
        { visibility: 'team', team: { members: { some: { userId } } } },
        // "open" visibility: any connected user can discover
        {
          visibility: 'open',
          members: {
            some: {
              connection: {
                OR: [{ requesterId: userId }, { accepterId: userId }],
                status: 'active',
              },
            },
          },
        },
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
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const { name, description, teamId, color, visibility } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const validVisibilities = ['private', 'team', 'open'];
    const vis = validVisibilities.includes(visibility) ? visibility : 'private';

    // If teamId, verify user is in the team and enforce project limits
    if (teamId) {
      const membership = await prisma.teamMember.findFirst({ where: { teamId, userId } });
      if (!membership) return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
      
      try {
        await checkTeamProjectLimit(teamId);
      } catch (err) {
        if (err instanceof FeatureGateError) {
          return NextResponse.json({ error: err.message, code: err.code, tier: err.tier }, { status: 403 });
        }
        throw err;
      }
    }

    // "team" visibility requires a team
    if (vis === 'team' && !teamId) {
      return NextResponse.json({ error: 'Team visibility requires a teamId' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description || null,
        teamId: teamId || null,
        color: color || null,
        visibility: vis,
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

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
