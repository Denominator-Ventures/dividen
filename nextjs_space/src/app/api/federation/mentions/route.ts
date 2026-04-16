export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-federation-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/federation/mentions?type=people|agents|commands&q=searchterm
 *
 * Federation-authenticated equivalent of /api/chat/mentions.
 * Allows connected instances to power inline @mention and !command
 * autocomplete UIs on their side, referencing DiviDen's users,
 * installed agents, and capabilities.
 *
 * Auth: X-Federation-Token header
 *
 * Query params:
 *   type  — "people" | "agents" | "commands" | "all" (default: "all")
 *   q     — search term (min 1 char, optional — returns top results if empty)
 *
 * Returns:
 *   { success: true, data: { people: [...], agents: [...], commands: [...] } }
 *
 * Privacy: Returns usernames, display names, and avatars for team/project
 * members the connection has access to. Does NOT expose emails.
 */
export async function GET(req: NextRequest) {
  try {
    const federationToken = req.headers.get('x-federation-token');
    if (!federationToken) {
      return NextResponse.json({ error: 'Missing X-Federation-Token header' }, { status: 401, headers: CORS_HEADERS });
    }

    const connection = await prisma.connection.findFirst({
      where: { isFederated: true, federationToken, status: 'active' },
    });
    if (!connection) {
      return NextResponse.json({ error: 'Invalid or inactive federation token' }, { status: 403, headers: CORS_HEADERS });
    }

    const localUserId = connection.requesterId;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const q = (searchParams.get('q') || '').toLowerCase().trim();

    const result: {
      people?: any[];
      agents?: any[];
      commands?: any[];
    } = {};

    // ── People ────────────────────────────────────────────────────────────
    if (type === 'people' || type === 'all') {
      // Find users the federated connection can "see":
      // 1. Users who share a team/project with the connection
      // 2. The connection owner themselves

      // Get team IDs where this connection is a member
      const teamMemberships = await prisma.teamMember.findMany({
        where: { connectionId: connection.id },
        select: { teamId: true },
      });
      const teamIds = teamMemberships.map(tm => tm.teamId);

      // Get project IDs where this connection is a member
      const projectMemberships = await prisma.projectMember.findMany({
        where: { connectionId: connection.id },
        select: { projectId: true },
      });
      const projectIds = projectMemberships.map(pm => pm.projectId);

      // Find all user IDs in those teams/projects
      const visibleUserIds = new Set<string>([localUserId]);

      if (teamIds.length > 0) {
        const teamUsers = await prisma.teamMember.findMany({
          where: { teamId: { in: teamIds }, userId: { not: null } },
          select: { userId: true },
        });
        teamUsers.forEach(tu => { if (tu.userId) visibleUserIds.add(tu.userId); });
      }

      if (projectIds.length > 0) {
        const projUsers = await prisma.projectMember.findMany({
          where: { projectId: { in: projectIds }, userId: { not: null } },
          select: { userId: true },
        });
        projUsers.forEach(pu => { if (pu.userId) visibleUserIds.add(pu.userId); });
      }

      // Query visible users
      const whereClause: any = {
        id: { in: Array.from(visibleUserIds) },
      };
      if (q) {
        whereClause.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
        ];
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          username: true,
          profilePhotoUrl: true,
          diviName: true,
        },
        take: 15,
        orderBy: { name: 'asc' },
      });

      result.people = users.map((u: any) => ({
        id: u.id,
        type: 'person',
        name: u.name,
        username: u.username,
        handle: u.username ? `@${u.username}` : null,
        avatar: u.profilePhotoUrl,
        diviName: u.diviName,
      }));
    }

    // ── Agents ────────────────────────────────────────────────────────────
    if (type === 'agents' || type === 'all') {
      // Return agents installed by the connection owner
      const agentWhere: any = {
        userId: localUserId,
        installed: true,
        status: 'active',
      };
      if (q) {
        agentWhere.agent = {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
          ],
        };
      }

      const subs = await prisma.marketplaceSubscription.findMany({
        where: agentWhere,
        include: {
          agent: {
            select: { id: true, name: true, slug: true, description: true, category: true, commands: true },
          },
        },
        take: 15,
      });

      result.agents = subs.map((s: any) => ({
        id: s.agent.id,
        type: 'agent',
        name: s.agent.name,
        slug: s.agent.slug,
        handle: `@${s.agent.slug}`,
        category: s.agent.category,
        description: s.agent.description?.slice(0, 120),
        hasCommands: !!(s.agent.commands),
      }));
    }

    // ── Commands ──────────────────────────────────────────────────────────
    if (type === 'commands' || type === 'all') {
      const commands: any[] = [];

      // Agent commands
      const agentSubs = await prisma.marketplaceSubscription.findMany({
        where: { userId: localUserId, installed: true, status: 'active', agent: { commands: { not: null } } },
        include: { agent: { select: { id: true, name: true, slug: true, commands: true } } },
        take: 50,
      });

      for (const s of agentSubs) {
        const cmds = safeJsonParse(s.agent.commands, []);
        for (const cmd of cmds) {
          const fullName = `${s.agent.slug}.${cmd.name}`;
          if (!q || fullName.includes(q) || (cmd.name || '').toLowerCase().includes(q) || (cmd.description || '').toLowerCase().includes(q)) {
            commands.push({
              id: `${s.agent.id}:${cmd.name}`,
              type: 'command',
              name: cmd.name,
              fullCommand: `!${fullName}`,
              source: s.agent.name,
              sourceSlug: s.agent.slug,
              sourceType: 'agent',
              description: cmd.description || '',
              usage: cmd.usage || `!${fullName}`,
            });
          }
        }
      }

      // Capability commands
      const userCaps = await prisma.userCapability.findMany({
        where: { userId: localUserId, status: 'active', capability: { commands: { not: null } } },
        include: { capability: { select: { id: true, name: true, slug: true, commands: true } } },
        take: 50,
      });

      for (const uc of userCaps) {
        const cmds = safeJsonParse(uc.capability.commands, []);
        for (const cmd of cmds) {
          const fullName = `${uc.capability.slug}.${cmd.name}`;
          if (!q || fullName.includes(q) || (cmd.name || '').toLowerCase().includes(q) || (cmd.description || '').toLowerCase().includes(q)) {
            commands.push({
              id: `${uc.capability.id}:${cmd.name}`,
              type: 'command',
              name: cmd.name,
              fullCommand: `!${fullName}`,
              source: uc.capability.name,
              sourceSlug: uc.capability.slug,
              sourceType: 'capability',
              description: cmd.description || '',
              usage: cmd.usage || `!${fullName}`,
            });
          }
        }
      }

      result.commands = commands.slice(0, 20);
    }

    return NextResponse.json({ success: true, data: result }, { headers: CORS_HEADERS });
  } catch (err: any) {
    console.error('[federation/mentions] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: CORS_HEADERS });
  }
}

function safeJsonParse(val: any, fallback: any) {
  if (!val) return fallback;
  try { return typeof val === 'string' ? JSON.parse(val) : val; } catch { return fallback; }
}
