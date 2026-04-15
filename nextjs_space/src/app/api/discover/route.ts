export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/discover?section=all|people|teams|agents|jobs
 *                   &skill=&industry=&capacity=&category=&teamType=
 *                   &limit=12&offset=0
 *
 * Browseable network discovery feed with faceted filters.
 * Returns curated sections: People, Teams, Agents, Jobs.
 */

function parseJson(val: string | null, fallback: any = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);

    const section = searchParams.get('section') || 'all';
    const skill = searchParams.get('skill')?.trim().toLowerCase() || '';
    const industry = searchParams.get('industry')?.trim().toLowerCase() || '';
    const capacity = searchParams.get('capacity') || '';
    const category = searchParams.get('category') || '';
    const teamType = searchParams.get('teamType') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 30);
    const offset = parseInt(searchParams.get('offset') || '0');

    const result: any = {};

    // ── People ──────────────────────────────────────────────────
    if (section === 'all' || section === 'people') {
      const where: any = {
        id: { not: userId },
        profile: { isNot: null, visibility: { not: 'private' } },
      };

      // Filters applied via post-query since skills/industry are JSON strings
      if (capacity) {
        where.profile = { ...where.profile, capacity };
      }

      const users = await prisma.user.findMany({
        where,
        take: limit + 20, // overfetch to allow post-filter
        skip: section === 'all' ? 0 : offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, createdAt: true,
          profile: {
            select: {
              headline: true, capacity: true, currentTitle: true,
              currentCompany: true, industry: true, skills: true,
              taskTypes: true, visibility: true, bio: true,
            },
          },
        },
      });

      // Get connections for status annotation
      const userIds = users.map((u: any) => u.id);
      const connections = userIds.length > 0 ? await prisma.connection.findMany({
        where: { OR: [
          { requesterId: userId, accepterId: { in: userIds } },
          { accepterId: userId, requesterId: { in: userIds } },
        ]},
        select: { requesterId: true, accepterId: true, status: true },
      }) : [];
      const connMap = new Map<string, string>();
      for (const c of connections) {
        const peerId = c.requesterId === userId ? c.accepterId : c.requesterId;
        if (peerId) connMap.set(peerId, c.status);
      }

      // Post-filter by skill and industry (stored as JSON strings)
      let filtered = users.map((u: any) => {
        const p = u.profile;
        const skills = parseJson(p?.skills);
        const taskTypes = parseJson(p?.taskTypes);
        return {
          id: u.id, name: u.name, email: u.email,
          headline: p?.headline, capacity: p?.capacity,
          currentTitle: p?.currentTitle, currentCompany: p?.currentCompany,
          industry: p?.industry, skills, taskTypes,
          bio: p?.visibility === 'public' ? p?.bio : null,
          connectionStatus: connMap.get(u.id) || null,
          joinedAt: u.createdAt.toISOString(),
        };
      });

      if (skill) {
        filtered = filtered.filter((u: any) =>
          u.skills?.some((s: string) => s.toLowerCase().includes(skill)) ||
          u.taskTypes?.some((t: string) => t.toLowerCase().includes(skill))
        );
      }
      if (industry) {
        filtered = filtered.filter((u: any) => u.industry?.toLowerCase().includes(industry));
      }

      result.people = {
        items: filtered.slice(0, limit),
        total: filtered.length,
        hasMore: filtered.length > limit,
      };
    }

    // ── Teams ───────────────────────────────────────────────────
    if (section === 'all' || section === 'teams') {
      const where: any = {
        visibility: { in: ['network', 'public'] },
        isActive: true,
      };
      if (teamType) where.type = teamType;
      if (industry) where.industry = { contains: industry, mode: 'insensitive' };

      const teams = await prisma.team.findMany({
        where,
        take: limit,
        skip: section === 'all' ? 0 : offset,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true, name: true, description: true, avatar: true,
          type: true, visibility: true, headline: true, industry: true,
          location: true, agentEnabled: true, createdAt: true,
          _count: { select: { members: true, projects: true, followers: true } },
          subscription: { select: { tier: true, status: true } },
        },
      });

      // Check follow status
      const teamIds = teams.map((t: any) => t.id);
      const follows = teamIds.length > 0 ? await prisma.teamFollow.findMany({
        where: { userId, teamId: { in: teamIds } },
        select: { teamId: true },
      }) : [];
      const followSet = new Set(follows.map((f: any) => f.teamId));

      // Check membership
      const memberships = teamIds.length > 0 ? await prisma.teamMember.findMany({
        where: { userId, teamId: { in: teamIds } },
        select: { teamId: true, role: true },
      }) : [];
      const memberMap = new Map<string, string>();
      for (const m of memberships) memberMap.set(m.teamId, m.role);

      result.teams = {
        items: teams.map((t: any) => ({
          id: t.id, name: t.name, description: t.description,
          avatar: t.avatar, type: t.type, visibility: t.visibility,
          headline: t.headline, industry: t.industry, location: t.location,
          agentEnabled: t.agentEnabled,
          memberCount: t._count.members, projectCount: t._count.projects,
          followerCount: t._count.followers,
          tier: t.subscription?.tier || null,
          isFollowing: followSet.has(t.id),
          memberRole: memberMap.get(t.id) || null,
        })),
        total: teams.length,
        hasMore: teams.length === limit,
      };
    }

    // ── Agents ──────────────────────────────────────────────────
    if (section === 'all' || section === 'agents') {
      const where: any = { status: 'active' };
      if (category) where.category = category;

      const agents = await prisma.marketplaceAgent.findMany({
        where,
        take: limit,
        skip: section === 'all' ? 0 : offset,
        orderBy: [{ featured: 'desc' }, { totalExecutions: 'desc' }],
        select: {
          id: true, name: true, slug: true, description: true,
          category: true, pricingModel: true, pricePerTask: true,
          subscriptionPrice: true, tags: true, avgRating: true,
          totalRatings: true, totalExecutions: true, avgResponseTime: true,
          successRate: true, featured: true, developerName: true, developerId: true,
          supportsA2A: true, supportsMCP: true, sourceInstanceId: true, sourceInstanceUrl: true,
        },
      });

      // Check install status
      const agentIds = agents.map((a: any) => a.id);
      const subs = agentIds.length > 0 ? await prisma.marketplaceSubscription.findMany({
        where: { userId, agentId: { in: agentIds } },
        select: { agentId: true, installed: true, status: true },
      }) : [];
      const subMap = new Map<string, any>();
      for (const s of subs) subMap.set(s.agentId, s);

      result.agents = {
        items: agents.map((a: any) => {
          const sub = subMap.get(a.id);
          return {
            id: a.id, name: a.name, slug: a.slug, description: a.description,
            category: a.category, pricingModel: a.pricingModel,
            pricePerTask: a.pricePerTask, subscriptionPrice: a.subscriptionPrice,
            tags: parseJson(a.tags), avgRating: a.avgRating,
            totalRatings: a.totalRatings, totalExecutions: a.totalExecutions,
            avgResponseTime: a.avgResponseTime, successRate: a.successRate,
            featured: a.featured, developerName: a.developerName, developerId: a.developerId,
            supportsA2A: a.supportsA2A, supportsMCP: a.supportsMCP,
            isFederated: !!a.sourceInstanceId, sourceInstanceUrl: a.sourceInstanceUrl,
            isInstalled: sub?.installed || false,
            isSubscribed: sub?.status === 'active',
          };
        }),
        total: agents.length,
        hasMore: agents.length === limit,
      };
    }

    // ── Jobs ────────────────────────────────────────────────────
    if (section === 'all' || section === 'jobs') {
      const where: any = {
        status: 'open',
        visibility: { in: ['network', 'connections'] },
        posterId: { not: userId },
      };

      const jobs = await prisma.networkJob.findMany({
        where,
        take: limit,
        skip: section === 'all' ? 0 : offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, description: true, taskType: true,
          urgency: true, compensation: true, compensationType: true,
          compensationAmount: true, compensationCurrency: true,
          isPaid: true, estimatedHours: true, deadline: true,
          requiredSkills: true, visibility: true, createdAt: true,
          poster: { select: { id: true, name: true } },
          _count: { select: { applications: true } },
        },
      });

      // Check if current user already applied
      const jobIds = jobs.map((j: any) => j.id);
      const applications = jobIds.length > 0 ? await prisma.jobApplication.findMany({
        where: { applicantId: userId, jobId: { in: jobIds } },
        select: { jobId: true, status: true },
      }) : [];
      const appMap = new Map<string, string>();
      for (const a of applications) appMap.set(a.jobId, a.status);

      result.jobs = {
        items: jobs.map((j: any) => ({
          id: j.id, title: j.title,
          description: j.description?.length > 200 ? j.description.slice(0, 200) + '...' : j.description,
          taskType: j.taskType, urgency: j.urgency,
          compensation: j.compensation, compensationType: j.compensationType,
          compensationAmount: j.compensationAmount, isPaid: j.isPaid,
          estimatedHours: j.estimatedHours,
          deadline: j.deadline?.toISOString() || null,
          requiredSkills: parseJson(j.requiredSkills),
          applicationCount: j._count.applications,
          posterName: j.poster?.name || 'Unknown',
          posterId: j.poster?.id,
          applicationStatus: appMap.get(j.id) || null,
          createdAt: j.createdAt.toISOString(),
        })),
        total: jobs.length,
        hasMore: jobs.length === limit,
      };
    }

    // ── Facet aggregates (for filter UI) ────────────────────────
    if (section === 'all') {
      // Collect available filter values
      const [skillAgg, categoryAgg] = await Promise.all([
        // Top skills from profiles
        prisma.userProfile.findMany({
          where: { visibility: { not: 'private' }, skills: { not: null } },
          select: { skills: true },
          take: 100,
        }),
        // Agent categories
        prisma.marketplaceAgent.groupBy({
          by: ['category'],
          where: { status: 'active' },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        }),
      ]);

      // Extract unique skills
      const skillCounts = new Map<string, number>();
      for (const p of skillAgg) {
        const skills = parseJson((p as any).skills);
        for (const s of skills) {
          const lower = (s as string).toLowerCase();
          skillCounts.set(lower, (skillCounts.get(lower) || 0) + 1);
        }
      }
      const topSkills = [...skillCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, count]) => ({ name, count }));

      result.facets = {
        skills: topSkills,
        agentCategories: categoryAgg.map((c: any) => ({ name: c.category, count: c._count.id })),
        teamTypes: ['work', 'community', 'hybrid'],
        capacities: ['available', 'limited', 'busy', 'unavailable'],
      };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('GET /api/discover error:', error);
    return NextResponse.json({ error: error.message || 'Discovery failed' }, { status: 500 });
  }
}
