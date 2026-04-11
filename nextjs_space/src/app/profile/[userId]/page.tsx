import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ProfileView from './ProfileView';

export const dynamic = 'force-dynamic';

interface Props {
  params: { userId: string };
}

function parseJson(val: string | null, fallback: any = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true },
  });
  if (!user) return { title: 'Profile Not Found' };
  return {
    title: `${user.name || 'Agent'} | DiviDen`,
    description: `View ${user.name || 'this agent'}'s profile on DiviDen`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) notFound();

  const profile = await prisma.userProfile.findUnique({
    where: { userId: params.userId },
  });

  // Fetch stats, agents, reputation, teams, reviews in parallel
  const [connectionCount, marketplaceAgents, reputation, teams, reviews] = await Promise.all([
    prisma.connection.count({
      where: {
        status: 'active',
        OR: [
          { requesterId: params.userId },
          { accepterId: params.userId },
        ],
      },
    }),
    prisma.marketplaceAgent.findMany({
      where: { developerId: params.userId, status: 'active' },
      select: {
        id: true, name: true, slug: true, description: true,
        category: true, pricingModel: true, pricePerTask: true,
        subscriptionPrice: true, avgRating: true, totalRatings: true,
        totalExecutions: true, avgResponseTime: true, successRate: true,
        version: true, tags: true,
      },
      orderBy: { totalExecutions: 'desc' },
      take: 12,
    }),
    prisma.reputationScore.findFirst({
      where: { userId: params.userId },
    }),
    prisma.team.findMany({
      where: {
        isActive: true,
        visibility: { in: ['network', 'public'] },
        members: { some: { userId: params.userId } },
      },
      select: {
        id: true, name: true, type: true, avatar: true, headline: true,
        _count: { select: { members: true } },
      },
      take: 10,
    }),
    prisma.jobReview.findMany({
      where: { revieweeId: params.userId },
      select: {
        id: true, rating: true, comment: true, type: true, createdAt: true,
        reviewerId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const isPublic = profile?.visibility === 'public';

  // Build the full profile data object
  const profileData = isPublic && profile ? {
    headline: profile.headline,
    bio: profile.bio,
    currentTitle: profile.currentTitle,
    currentCompany: profile.currentCompany,
    industry: profile.industry,
    skills: parseJson(profile.skills),
    taskTypes: parseJson(profile.taskTypes),
    experience: parseJson(profile.experience),
    education: parseJson(profile.education),
    languages: parseJson(profile.languages),
    countriesLived: parseJson(profile.countriesLived),
    lifeExperiences: parseJson(profile.lifeExperiences),
    volunteering: parseJson(profile.volunteering),
    hobbies: parseJson(profile.hobbies),
    personalValues: parseJson(profile.personalValues),
    superpowers: parseJson(profile.superpowers),
    capacity: profile.capacity,
    capacityNote: profile.capacityNote,
    timezone: profile.timezone,
    workingHours: profile.workingHours,
    linkedinUrl: profile.linkedinUrl,
    visibility: profile.visibility,
  } : null;

  return (
    <ProfileView
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      }}
      profile={profileData}
      stats={{
        connections: connectionCount,
        agents: marketplaceAgents.length,
        reputation: reputation ? {
          score: reputation.score,
          level: reputation.level,
          jobsCompleted: reputation.jobsCompleted,
          jobsPosted: reputation.jobsPosted,
          avgRating: reputation.avgRating,
          totalRatings: reputation.totalRatings,
          onTimeRate: reputation.onTimeRate,
          responseRate: reputation.responseRate,
        } : null,
      }}
      agents={marketplaceAgents.map((a: any) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        description: a.description,
        category: a.category,
        pricingModel: a.pricingModel,
        price: a.pricePerTask || a.subscriptionPrice || null,
        avgRating: a.avgRating,
        totalRatings: a.totalRatings,
        totalExecutions: a.totalExecutions,
        avgResponseTime: a.avgResponseTime,
        successRate: a.successRate,
        version: a.version,
        tags: parseJson(a.tags),
      }))}
      teams={teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        avatar: t.avatar,
        headline: t.headline,
        memberCount: t._count.members,
      }))}
      reviews={await (async () => {
        const reviewerIds = [...new Set(reviews.map((r: any) => r.reviewerId))];
        const reviewers = reviewerIds.length > 0 
          ? await prisma.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, name: true } })
          : [];
        const reviewerMap = new Map(reviewers.map(u => [u.id, u.name]));
        return reviews.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          type: r.type,
          createdAt: r.createdAt.toISOString(),
          reviewerName: reviewerMap.get(r.reviewerId) || 'Anonymous',
          reviewerId: r.reviewerId,
        }));
      })()}
    />
  );
}
