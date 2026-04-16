export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/v2/network/discover — Public network discovery feed.
 * Returns public profiles, teams, and marketplace agents for federated instances.
 *
 * Authentication: Bearer token (platform token from instance registration)
 *   OR no auth for basic public stats.
 *
 * Query params:
 *   ?type=profiles|teams|agents|all  (default: all)
 *   ?limit=N   (default 50, max 200)
 *   ?offset=N  (default 0)
 *   ?q=search  (search term)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const q = searchParams.get('q')?.toLowerCase();

    // Check for platform token (federated instance auth)
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let isAuthenticated = false;

    if (token) {
      const instance = await prisma.instanceRegistry.findFirst({
        where: { platformToken: token, platformLinked: true, isActive: true },
      });
      if (instance) {
        isAuthenticated = true;
        // Update last seen
        await prisma.instanceRegistry.update({
          where: { id: instance.id },
          data: { lastSeenAt: new Date(), lastSyncAt: new Date() },
        }).catch(() => {});
      }
    }

    const result: any = {};

    // Discoverable profiles — users with public/connections profiles + users without profiles (basic info)
    if (type === 'all' || type === 'profiles') {
      // Fetch users who have profiles with public/connections visibility
      const profileWhere: any = { visibility: { in: ['public', 'connections'] } };
      if (q) {
        profileWhere.OR = [
          { headline: { contains: q, mode: 'insensitive' } },
          { bio: { contains: q, mode: 'insensitive' } },
          { currentTitle: { contains: q, mode: 'insensitive' } },
          { currentCompany: { contains: q, mode: 'insensitive' } },
          { industry: { contains: q, mode: 'insensitive' } },
          { user: { name: { contains: q, mode: 'insensitive' } } },
        ];
      }
      const profiledUsers = await prisma.userProfile.findMany({
        where: profileWhere,
        select: {
          id: true,
          headline: true,
          bio: true,
          currentTitle: true,
          currentCompany: true,
          industry: true,
          skills: true,
          timezone: true,
          capacity: true,
          taskTypes: true,
          visibility: true,
          userId: true,
          user: { select: { id: true, name: true, email: true } },
          ...(isAuthenticated ? {
            languages: true,
            hobbies: true,
            superpowers: true,
          } : {}),
        },
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
      });

      // Also fetch users WITHOUT profiles (still discoverable by name)
      const profiledUserIds = profiledUsers.map((p: any) => p.userId).filter(Boolean);
      const userWhere: any = {
        id: { notIn: profiledUserIds },
        // Exclude test/system accounts
        email: { notIn: ['admin@dividen.ai', 'john@doe.com'] },
      };
      if (q) {
        userWhere.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ];
      }
      const unprofiledUsers = await prisma.user.findMany({
        where: userWhere,
        select: { id: true, name: true, email: true },
        take: Math.max(limit - profiledUsers.length, 10),
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      // Merge results
      const profileItems = profiledUsers.map((p: any) => {
        const isPublic = p.visibility === 'public';
        return {
          id: p.id,
          userId: p.user?.id || null,
          name: p.user?.name || null,
          email: isPublic ? (p.user?.email || null) : null,
          headline: p.headline,
          currentTitle: p.currentTitle,
          currentCompany: p.currentCompany,
          industry: p.industry,
          capacity: p.capacity,
          skills: p.skills,
          taskTypes: p.taskTypes,
          timezone: p.timezone,
          bio: isPublic ? p.bio : null,
          visibility: p.visibility,
          hasProfile: true,
          ...(isAuthenticated && isPublic ? {
            languages: p.languages,
            hobbies: p.hobbies,
            superpowers: p.superpowers,
          } : {}),
        };
      });

      const basicItems = unprofiledUsers.map((u: any) => ({
        id: `user_${u.id}`,
        userId: u.id,
        name: u.name,
        email: null, // Don't expose email for basic profiles
        headline: null,
        currentTitle: null,
        currentCompany: null,
        industry: null,
        capacity: null,
        skills: null,
        taskTypes: null,
        timezone: null,
        bio: null,
        visibility: 'connections',
        hasProfile: false,
      }));

      const allProfiles = [...profileItems, ...basicItems];
      result.profiles = {
        items: allProfiles,
        total: allProfiles.length,
      };
    }

    // Public teams
    if (type === 'all' || type === 'teams') {
      const where: any = { isActive: true };
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ];
      }
      const [teams, teamCount] = await Promise.all([
        prisma.team.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            avatar: true,
            _count: { select: { members: true } },
          },
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.team.count({ where }),
      ]);
      result.teams = {
        items: teams.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          avatar: t.avatar,
          memberCount: t._count.members,
        })),
        total: teamCount,
      };
    }

    // Marketplace agents (active ones)
    if (type === 'all' || type === 'agents') {
      const where: any = { status: 'active' };
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ];
      }
      const [agents, agentCount] = await Promise.all([
        prisma.marketplaceAgent.findMany({
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            category: true,
            tags: true,
            pricingModel: true,
            pricePerTask: true,
            subscriptionPrice: true,
            developerName: true,
            developerUrl: true,
            featured: true,
            totalExecutions: true,
            avgRating: true,
            totalRatings: true,
            inputFormat: true,
            outputFormat: true,
            samplePrompts: true,
          },
          take: limit,
          skip: offset,
          orderBy: { totalExecutions: 'desc' },
        }),
        prisma.marketplaceAgent.count({ where }),
      ]);
      result.agents = { items: agents, total: agentCount };
    }

    // Network stats (always included)
    const [userCount, teamCount, agentCount, instanceCount] = await Promise.all([
      prisma.user.count(),
      prisma.team.count({ where: { isActive: true } }),
      prisma.marketplaceAgent.count({ where: { status: 'active' } }),
      prisma.instanceRegistry.count({ where: { isActive: true, platformLinked: true } }),
    ]);

    result.networkStats = {
      users: userCount,
      teams: teamCount,
      agents: agentCount,
      federatedInstances: instanceCount,
    };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': isAuthenticated ? 'private, max-age=60' : 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error: any) {
    console.error('GET /api/v2/network/discover error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
