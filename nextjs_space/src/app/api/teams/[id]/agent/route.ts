export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTeamPro, FeatureGateError } from '@/lib/feature-gates';

/**
 * Team Agent API
 * GET  — get agent config + status
 * PUT  — enable/disable + update config (owner/admin only)
 * POST — query the team agent (sends a coordination prompt to all member Divis)
 */

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
      select: {
        id: true, name: true, agentEnabled: true, agentConfig: true,
        subscription: { select: { tier: true, status: true } },
        members: {
          select: {
            id: true, role: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    let config: any = {};
    if (team.agentConfig) {
      try { config = JSON.parse(team.agentConfig); } catch {}
    }

    return NextResponse.json({
      enabled: team.agentEnabled,
      config,
      requiresPro: true,
      isPro: team.subscription?.tier === 'pro',
      memberCount: team.members.length,
    });
  } catch (error: any) {
    console.error('GET /api/teams/:id/agent error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Only owner/admin can configure
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: { in: ['owner', 'admin'] } },
    });
    if (!membership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    // Require Pro subscription
    try {
      await requireTeamPro(params.id);
    } catch (err) {
      if (err instanceof FeatureGateError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
      }
      throw err;
    }

    const body = await req.json();
    const data: any = {};

    if (body.enabled !== undefined) data.agentEnabled = !!body.enabled;
    if (body.config !== undefined) {
      // Validate config shape
      const validConfig = {
        personality: body.config.personality || 'coordinator',
        checkInFrequency: body.config.checkInFrequency || 'daily',
        notifyOn: body.config.notifyOn || ['blockers', 'milestones'],
        systemPromptOverride: body.config.systemPromptOverride || null,
        autoSuggestTasks: body.config.autoSuggestTasks !== false,
        autoSurfaceBlockers: body.config.autoSurfaceBlockers !== false,
        synthesizeUpdates: body.config.synthesizeUpdates !== false,
      };
      data.agentConfig = JSON.stringify(validConfig);
    }

    const team = await prisma.team.update({
      where: { id: params.id },
      data,
      select: { id: true, agentEnabled: true, agentConfig: true },
    });

    let config: any = {};
    if (team.agentConfig) {
      try { config = JSON.parse(team.agentConfig); } catch {}
    }

    return NextResponse.json({ enabled: team.agentEnabled, config });
  } catch (error: any) {
    console.error('PUT /api/teams/:id/agent error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
