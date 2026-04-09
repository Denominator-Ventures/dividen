export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assembleProjectContext, generateProjectDashboardMarkdown } from '@/lib/brief-assembly';

/**
 * GET /api/federation/project/:id/context
 *
 * Federation-facing endpoint that lets a remote Divi instance fetch the
 * cross-member project dashboard for a project the remote user participates in.
 *
 * Auth: x-federation-token header — must match an active federated connection
 * whose connectionId appears as a ProjectMember on the requested project.
 *
 * Query params:
 *   ?format=markdown  — returns rendered Markdown dashboard string
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const federationToken = req.headers.get('x-federation-token');
    if (!federationToken) {
      return NextResponse.json({ error: 'Missing federation token' }, { status: 401 });
    }

    // ── Check federation config ────────────────────────────────────────
    const fedConfig = await prisma.federationConfig.findFirst();
    if (!fedConfig || !fedConfig.allowInbound) {
      return NextResponse.json({ error: 'Inbound federation disabled' }, { status: 403 });
    }

    // ── Validate federation token against active connections ───────────
    const connection = await prisma.connection.findFirst({
      where: {
        isFederated: true,
        federationToken,
        status: 'active',
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'No active federated connection found for this token' },
        { status: 404 },
      );
    }

    // ── Verify the federated connection is a member of this project ───
    const projectId = params.id;
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        connectionId: connection.id,
      },
    });

    if (!membership) {
      // Also check if the connection's local user (requesterId) is a member
      const localMembership = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: connection.requesterId,
        },
      });
      if (!localMembership) {
        return NextResponse.json(
          { error: 'Federated connection is not a member of this project' },
          { status: 403 },
        );
      }
    }

    // ── Assemble project context ──────────────────────────────────────
    // Use the local user (requesterId) to pull context, since the remote
    // user's Divi needs the same view a local member sees.
    const ctx = await assembleProjectContext(projectId, connection.requesterId);
    if (!ctx) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // ── Format response ───────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    if (searchParams.get('format') === 'markdown') {
      return NextResponse.json(
        { markdown: generateProjectDashboardMarkdown(ctx) },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    return NextResponse.json(ctx, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('GET /api/federation/project/:id/context error:', error);
    return NextResponse.json(
      { error: error.message || 'Federation project context failed' },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS — CORS preflight for cross-instance requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-federation-token',
      'Access-Control-Max-Age': '86400',
    },
  });
}
