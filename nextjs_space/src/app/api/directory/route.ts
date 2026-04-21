export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

function parseJsonField(val: string | null, fallback: any = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

// GET /api/directory — browse discoverable users on this instance
async function _GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim().toLowerCase() || '';
    const skill = searchParams.get('skill')?.trim().toLowerCase() || '';
    const taskType = searchParams.get('taskType')?.trim() || '';

    // Get all users except the current user, with their profiles
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        profile: true,
      },
    });

    // Get current user's connections to annotate status
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { accepterId: userId },
        ],
      },
      select: {
        id: true,
        requesterId: true,
        accepterId: true,
        status: true,
      },
    });

    const connectionMap = new Map<string, { status: string; direction: 'outbound' | 'inbound'; connectionId: string }>();
    for (const c of connections) {
      const peerId = c.requesterId === userId ? c.accepterId : c.requesterId;
      const direction = c.requesterId === userId ? 'outbound' : 'inbound';
      if (peerId) connectionMap.set(peerId, { status: c.status, direction, connectionId: c.id });
    }

    // Filter and transform
    const results = users
      .filter((u: any) => {
        // Only show users with profiles that have public or connections visibility
        // If no profile, they're still discoverable by name/email but with limited info
        const vis = u.profile?.visibility || 'connections';
        if (vis === 'private') return false;
        // "connections" visibility: show in directory but with limited profile details
        // "public" visibility: show full profile
        return true;
      })
      .map((u: any) => {
        const p = u.profile;
        const vis = p?.visibility || 'connections';
        const isPublic = vis === 'public';
        const sharedSections = parseJsonField(p?.sharedSections ?? null, ['professional', 'availability']);

        // Always visible
        const base: any = {
          id: u.id,
          name: u.name,
          email: u.email,
          connectionStatus: connectionMap.get(u.id)?.status || null,
          connectionDirection: connectionMap.get(u.id)?.direction || null,
          connectionId: connectionMap.get(u.id)?.connectionId || null,
          joinedAt: u.createdAt.toISOString(),
          hasProfile: !!p,
        };

        if (p) {
          // Basic profile info always shared in directory
          base.headline = p.headline;
          base.capacity = p.capacity;
          base.currentTitle = p.currentTitle;
          base.currentCompany = p.currentCompany;

          if (isPublic || sharedSections.includes('professional')) {
            base.skills = parseJsonField(p.skills);
            base.industry = p.industry;
          }
          if (isPublic || sharedSections.includes('availability')) {
            base.timezone = p.timezone;
          }
          if (isPublic || sharedSections.includes('lived_experience')) {
            base.languages = parseJsonField(p.languages);
            base.countriesLived = parseJsonField(p.countriesLived);
            base.superpowers = parseJsonField(p.superpowers);
          }
          base.taskTypes = parseJsonField(p.taskTypes);
          base.bio = isPublic ? p.bio : null;
        }

        return base;
      })
      .filter((u: any) => {
        // Apply search query
        if (q) {
          const haystack = [
            u.name, u.email, u.headline, u.currentTitle,
            u.currentCompany, u.industry, u.bio,
            ...(u.skills || []),
            ...(u.superpowers || []),
          ].filter(Boolean).join(' ').toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        // Skill filter
        if (skill && u.skills) {
          const hasSkill = u.skills.some((s: string) => s.toLowerCase().includes(skill));
          if (!hasSkill) return false;
        }
        // Task type filter
        if (taskType && u.taskTypes) {
          if (!u.taskTypes.includes(taskType)) return false;
        }
        return true;
      });

    // ── Also include discoverable federated instances ──
    let federatedEntries: any[] = [];
    try {
      const instances = await prisma.instanceRegistry.findMany({
        where: {
          isActive: true,
          platformLinked: true,
          discoveryEnabled: true,
        },
        select: {
          id: true,
          name: true,
          baseUrl: true,
          userCount: true,
          agentCount: true,
          version: true,
          metadata: true,
          operatorName: true,
          operatorEmail: true,
        },
      });

      // Only show instances that have a named operator — these appear as people, not as raw instances
      federatedEntries = instances
        .filter((inst: any) => {
          if (!inst.operatorName) return false; // Hide unnamed instances
          if (!q) return true;
          const haystack = [inst.operatorName, inst.operatorEmail, inst.name].filter(Boolean).join(' ').toLowerCase();
          return haystack.includes(q);
        })
        .map((inst: any) => ({
          id: `fed_${inst.id}`,
          name: inst.operatorName,
          email: inst.operatorEmail || null,
          source: 'federated_operator',
          instanceId: inst.id,
          instanceUrl: inst.baseUrl,
          instanceName: inst.name,
          userCount: inst.userCount,
          agentCount: inst.agentCount,
          version: inst.version,
          connectionStatus: null,
          connectionDirection: null,
          connectionId: null,
          hasProfile: true,
          headline: `Operator of ${inst.name}`,
          currentTitle: 'Instance Operator',
          currentCompany: inst.name,
        }));
    } catch (e) {
      // Non-critical — federated entries are optional
      console.warn('Failed to fetch federated instances for directory:', e);
    }

    let federatedDevelopers: any[] = [];
    try {
      const fedAgents = await prisma.marketplaceAgent.findMany({
        where: {
          sourceInstanceId: { not: null },
          status: 'active',
          ...(q ? { developerName: { contains: q, mode: 'insensitive' as const } } : {}),
        },
        select: { developerName: true, developerUrl: true, slug: true, sourceInstanceId: true, sourceInstanceUrl: true },
        distinct: ['developerName', 'sourceInstanceId'],
        take: 20,
      });

      federatedDevelopers = fedAgents.map((a: any) => {
        const hostname = a.sourceInstanceUrl ? (() => { try { return new URL(a.sourceInstanceUrl).hostname; } catch { return 'Federated'; } })() : 'Federated';
        return {
          id: `feddev_${a.slug}`,
          name: a.developerName,
          email: null,
          source: 'federated_developer',
          instanceUrl: a.sourceInstanceUrl,
          profileUrl: `/developer/${a.slug}`,
          connectionStatus: null,
          hasProfile: true,
          headline: `🌐 Federated developer via ${hostname}`,
        };
      });
    } catch (e) {
      console.warn('Failed to fetch federated developers for directory:', e);
    }

    const allResults = [...results, ...federatedDevelopers, ...federatedEntries];

    return NextResponse.json({
      users: allResults,
      total: allResults.length,
    });
  } catch (error: any) {
    console.error('GET /api/directory error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch directory' }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
