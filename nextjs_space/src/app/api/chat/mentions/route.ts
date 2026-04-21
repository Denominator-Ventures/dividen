export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * GET /api/chat/mentions?type=people|agents|commands&q=searchterm
 * Returns matching entities for inline @mention and !command search.
 */
async function _GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'people'; // 'people' | 'agents' | 'commands'
    const q = (url.searchParams.get('q') || '').toLowerCase().trim();

    if (type === 'people') {
      // 1) Local users on this instance (by name / username / email)
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, username: true, email: true, profilePhotoUrl: true, diviName: true },
        take: 10,
        orderBy: { name: 'asc' },
      });

      const localResults = users.map((u: any) => ({
        id: u.id,
        type: 'person' as const,
        name: u.name || u.email,
        username: u.username,
        avatar: u.profilePhotoUrl,
        subtitle: u.username ? `@${u.username}` : u.email,
        diviName: u.diviName,
      }));

      // 2) Federated connections (peer users on OTHER DiviDen instances — e.g. FVP)
      // These peers don't have a local User row, so they'd never surface via the user
      // search above. Surface them here so users can @-mention them in chat.
      const fedConns = await prisma.connection.findMany({
        where: {
          OR: [
            { requesterId: userId },
            { accepterId: userId },
          ],
          isFederated: true,
          status: 'active',
          ...(q
            ? {
                AND: [
                  {
                    OR: [
                      { nickname: { contains: q, mode: 'insensitive' } },
                      { peerNickname: { contains: q, mode: 'insensitive' } },
                      { peerUserName: { contains: q, mode: 'insensitive' } },
                      { peerUserEmail: { contains: q, mode: 'insensitive' } },
                      { peerInstanceUrl: { contains: q, mode: 'insensitive' } },
                    ],
                  },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          requesterId: true,
          accepterId: true,
          nickname: true,
          peerNickname: true,
          peerInstanceUrl: true,
          peerUserId: true,
          peerUserName: true,
          peerUserEmail: true,
        },
        take: 10,
      });

      const federatedResults = fedConns.map((c: any) => {
        // Pick the best display name — prefer the nickname WE set, then peer's own name/email.
        const isRequester = c.requesterId === userId;
        const myNickname = isRequester ? c.nickname : c.peerNickname;
        const displayName = myNickname || c.peerUserName || c.peerUserEmail || 'Peer';

        // Build a handle: nickname → peer username slug → peer email local part → peer user id.
        const handleSource = myNickname || c.peerUserName || c.peerUserEmail || c.peerUserId || 'peer';
        const cleanedHandle = String(handleSource)
          .toLowerCase()
          .split('@')[0] // strip email domain
          .replace(/[^a-z0-9_.-]/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 30);

        // Pretty-print the instance origin (e.g. fvp.dividen.ai → "FVP")
        let instanceLabel = '';
        try {
          if (c.peerInstanceUrl) {
            const host = new URL(c.peerInstanceUrl).hostname.replace(/^www\./, '');
            instanceLabel = host;
          }
        } catch {
          instanceLabel = c.peerInstanceUrl || '';
        }

        const subtitleParts: string[] = [];
        if (cleanedHandle) subtitleParts.push(`@${cleanedHandle}`);
        if (instanceLabel) subtitleParts.push(`on ${instanceLabel}`);

        return {
          id: c.id, // connection id — not a user id
          type: 'person' as const,
          name: displayName,
          username: cleanedHandle || null,
          avatar: null,
          subtitle: subtitleParts.join(' · ') || 'Federated peer',
          // Extra hints for consumers that understand federation:
          federated: true as const,
          peerInstanceUrl: c.peerInstanceUrl || null,
          peerUserId: c.peerUserId || null,
          connectionId: c.id,
        };
      });

      // Merge: local users first, then federated peers. Cap at 12 total so the
      // dropdown stays compact but federated peers aren't hidden behind 10 locals.
      const merged = [...localResults, ...federatedResults].slice(0, 12);

      return NextResponse.json({ success: true, data: merged });
    }

    if (type === 'agents') {
      // Search installed agents (subscribed + installed)
      const subs = await prisma.marketplaceSubscription.findMany({
        where: {
          userId,
          installed: true,
          status: 'active',
          agent: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        include: {
          agent: {
            select: { id: true, name: true, slug: true, description: true, category: true, commands: true },
          },
        },
        take: 10,
      });

      return NextResponse.json({
        success: true,
        data: subs.map((s: any) => ({
          id: s.agent.id,
          type: 'agent' as const,
          name: s.agent.name,
          username: s.agent.slug,
          subtitle: `@${s.agent.slug} · ${s.agent.category}`,
          description: s.agent.description?.slice(0, 80),
          commands: safeJsonParse(s.agent.commands, []),
        })),
      });
    }

    if (type === 'teams') {
      // Search teams the user is a member of
      const memberships = await prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      const teamIds = memberships.map((m: any) => m.teamId);

      if (teamIds.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      const teams = await prisma.team.findMany({
        where: {
          id: { in: teamIds },
          isActive: true,
          ...(q ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          } : {}),
        },
        select: {
          id: true,
          name: true,
          avatar: true,
          description: true,
          type: true,
          _count: { select: { members: true } },
        },
        take: 10,
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({
        success: true,
        data: teams.map((t: any) => ({
          id: t.id,
          type: 'team' as const,
          name: t.name,
          avatar: t.avatar,
          subtitle: `${t._count.members} member${t._count.members === 1 ? '' : 's'} · ${t.type}`,
          description: t.description?.slice(0, 80),
          memberCount: t._count.members,
        })),
      });
    }

    if (type === 'commands') {
      // Search commands from installed agents + installed capabilities
      const results: any[] = [];

      // Agent commands
      const agentSubs = await prisma.marketplaceSubscription.findMany({
        where: { userId, installed: true, status: 'active', agent: { commands: { not: null } } },
        include: { agent: { select: { id: true, name: true, slug: true, commands: true } } },
        take: 50,
      });

      for (const s of agentSubs) {
        const cmds = safeJsonParse(s.agent.commands, []);
        for (const cmd of cmds) {
          const fullName = `${s.agent.slug}.${cmd.name}`;
          if (!q || fullName.includes(q) || (cmd.name || '').toLowerCase().includes(q) || (cmd.description || '').toLowerCase().includes(q)) {
            results.push({
              id: `${s.agent.id}:${cmd.name}`,
              type: 'command' as const,
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
        where: { userId, status: 'active', capability: { commands: { not: null } } },
        include: { capability: { select: { id: true, name: true, slug: true, commands: true } } },
        take: 50,
      });

      for (const uc of userCaps) {
        const cmds = safeJsonParse(uc.capability.commands, []);
        for (const cmd of cmds) {
          const fullName = `${uc.capability.slug}.${cmd.name}`;
          if (!q || fullName.includes(q) || (cmd.name || '').toLowerCase().includes(q) || (cmd.description || '').toLowerCase().includes(q)) {
            results.push({
              id: `${uc.capability.id}:${cmd.name}`,
              type: 'command' as const,
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

      return NextResponse.json({ success: true, data: results.slice(0, 15) });
    }

    return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    console.error('[mentions] error:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

function safeJsonParse(val: any, fallback: any) {
  if (!val) return fallback;
  try { return typeof val === 'string' ? JSON.parse(val) : val; } catch { return fallback; }
}

export const GET = withTelemetry(_GET);
