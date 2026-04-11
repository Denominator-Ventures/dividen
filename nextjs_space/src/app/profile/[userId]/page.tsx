import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ProfileView from './ProfileView';

export const dynamic = 'force-dynamic';

interface Props {
  params: { userId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true, email: true },
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

  // Public stats
  const [connectionCount, marketplaceAgents, reputation] = await Promise.all([
    prisma.connection.count({
      where: {
        OR: [
          { requesterId: params.userId, status: 'accepted' },
          { accepterId: params.userId, status: 'accepted' },
        ],
      },
    }),
    prisma.marketplaceAgent.findMany({
      where: { developerId: params.userId, status: 'published' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        pricingModel: true,
        pricePerTask: true,
        subscriptionPrice: true,
        avgRating: true,
        totalExecutions: true,
        version: true,
      },
      orderBy: { totalExecutions: 'desc' },
      take: 12,
    }),
    prisma.reputationScore.findFirst({
      where: { userId: params.userId },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  // Respect profile visibility
  const isPublic = profile?.visibility === 'public';

  return (
    <ProfileView
      user={{
        id: user.id,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      }}
      profile={isPublic && profile ? {
        headline: profile.headline,
        bio: profile.bio,
        skills: profile.skills,
        taskTypes: profile.taskTypes,
        capacity: profile.capacity,
        capacityNote: profile.capacityNote,
        timezone: profile.timezone,
      } : null}
      stats={{
        connections: connectionCount,
        agents: marketplaceAgents.length,
        reputation: reputation ? {
          score: reputation.score,
          level: reputation.level,
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
        totalExecutions: a.totalExecutions,
        version: a.version,
      }))}
    />
  );
}
