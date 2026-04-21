export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * GET /api/extensions
 * List all extensions visible to the current user (own + team/project scoped).
 * Query params: ?scope=user|team|project|global  &scopeId=xxx  &type=skill|persona|prompt_layer
 */
async function _GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const scopeFilter = searchParams.get('scope');
    const scopeId = searchParams.get('scopeId');
    const typeFilter = searchParams.get('type');

    // Build where clause — user can see their own + team/project they belong to + global
    const [teamMemberships, projectMemberships] = await Promise.all([
      prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } }),
      prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } }),
    ]);
    const teamIds = teamMemberships.map((m: any) => m.teamId);
    const projectIds = projectMemberships.map((m: any) => m.projectId);

    const where: any = {
      OR: [
        { scope: 'user', installedById: userId },
        { scope: 'global' },
        ...(teamIds.length > 0 ? [{ scope: 'team', scopeId: { in: teamIds } }] : []),
        ...(projectIds.length > 0 ? [{ scope: 'project', scopeId: { in: projectIds } }] : []),
      ],
    };

    if (scopeFilter) where.scope = scopeFilter;
    if (scopeId) where.scopeId = scopeId;
    if (typeFilter) where.type = typeFilter;

    const extensions = await prisma.agentExtension.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: { installedBy: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(extensions);
  } catch (error: any) {
    console.error('GET /api/extensions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/extensions
 * Install a new extension. Accepts either a full config object or a Claw Mart import.
 */
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const {
      name,
      slug,
      description,
      type = 'skill',
      source = 'manual',
      sourceUrl,
      version = '1.0.0',
      config,
      scope = 'user',
      scopeId,
      priority = 0,
    } = body;

    if (!name || !config) {
      return NextResponse.json({ error: 'name and config are required' }, { status: 400 });
    }

    // Validate config is parseable JSON
    let parsedConfig: any;
    if (typeof config === 'string') {
      try { parsedConfig = JSON.parse(config); } catch {
        return NextResponse.json({ error: 'config must be valid JSON' }, { status: 400 });
      }
    } else {
      parsedConfig = config;
    }

    // Validate scope access
    if (scope === 'team' && scopeId) {
      const membership = await prisma.teamMember.findFirst({ where: { teamId: scopeId, userId } });
      if (!membership) return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
    }
    if (scope === 'project' && scopeId) {
      const membership = await prisma.projectMember.findFirst({ where: { projectId: scopeId, userId } });
      if (!membership) return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 });
    }

    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const extension = await prisma.agentExtension.create({
      data: {
        name,
        slug: finalSlug,
        description,
        type,
        source,
        sourceUrl,
        version,
        config: typeof parsedConfig === 'string' ? parsedConfig : JSON.stringify(parsedConfig),
        scope,
        scopeId: scope === 'user' || scope === 'global' ? null : scopeId,
        installedById: userId,
        priority,
      },
    });

    return NextResponse.json(extension, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/extensions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
