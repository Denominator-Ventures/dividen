export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/chat/mentions?type=people|agents|commands&q=searchterm
 * Returns matching entities for inline @mention and !command search.
 */
export async function GET(req: NextRequest) {
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
      // Search users by name, username, or email
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

      return NextResponse.json({
        success: true,
        data: users.map((u: any) => ({
          id: u.id,
          type: 'person' as const,
          name: u.name || u.email,
          username: u.username,
          avatar: u.profilePhotoUrl,
          subtitle: u.username ? `@${u.username}` : u.email,
          diviName: u.diviName,
        })),
      });
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
