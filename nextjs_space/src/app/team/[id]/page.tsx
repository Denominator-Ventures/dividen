export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TeamProfileView } from './TeamProfileView';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const team = await prisma.team.findUnique({
    where: { id: params.id },
    select: { name: true, headline: true },
  });
  if (!team) return { title: 'Team Not Found' };
  return {
    title: team.name,
    description: team.headline || `${team.name} on DiviDen`,
  };
}

export default async function TeamProfilePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || null;

  const team = await prisma.team.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, profile: { select: { headline: true, capacity: true } } } },
          connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true, isFederated: true } },
        },
        orderBy: { joinedAt: 'asc' },
      },
      projects: {
        where: { status: { not: 'archived' } },
        select: {
          id: true, name: true, status: true, color: true, visibility: true,
          _count: { select: { members: true, kanbanCards: true } },
        },
        orderBy: { updatedAt: 'desc' },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      subscription: true,
      _count: { select: { followers: true, queueItems: true, relays: true, goals: true } },
    },
  });

  if (!team) notFound();

  // Cast to any for complex include type
  const t = team as any;

  // Visibility check
  const isMember = userId ? t.members.some((m: any) => m.userId === userId) : false;
  const isOwner = userId === t.createdById;

  if (t.visibility === 'private' && !isMember) {
    // Check if user follows this team
    if (userId) {
      const follow = await prisma.teamFollow.findFirst({ where: { teamId: t.id, userId } });
      if (!follow) notFound();
    } else {
      notFound();
    }
  }

  // Filter projects by visibility for non-members
  const visibleProjects = isMember
    ? t.projects
    : t.projects.filter((p: any) => p.visibility === 'open' || p.visibility === 'team');

  // Check if current user follows this team
  let isFollowing = false;
  if (userId && !isMember) {
    const follow = await prisma.teamFollow.findFirst({ where: { teamId: t.id, userId } });
    isFollowing = !!follow;
  }

  return (
    <TeamProfileView
      team={{
        id: t.id,
        name: t.name,
        description: t.description,
        avatar: t.avatar,
        type: t.type,
        visibility: t.visibility,
        headline: t.headline,
        website: t.website,
        location: t.location,
        industry: t.industry,
        foundedAt: t.foundedAt?.toISOString() || null,
        agentEnabled: t.agentEnabled,
        createdAt: t.createdAt.toISOString(),
        createdBy: t.createdBy,
        subscription: t.subscription ? {
          tier: t.subscription.tier,
          status: t.subscription.status,
          memberLimit: t.subscription.memberLimit,
          trialEndsAt: t.subscription.trialEndsAt?.toISOString() || null,
        } : null,
      }}
      members={t.members.map((m: any) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        user: m.user ? {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          headline: m.user.profile?.headline || null,
          capacity: m.user.profile?.capacity || null,
          avatar: null,
        } : null,
        connection: m.connection ? {
          id: m.connection.id,
          peerUserName: m.connection.peerUserName,
          peerInstanceUrl: m.connection.peerInstanceUrl,
          isFederated: m.connection.isFederated,
        } : null,
      }))}
      projects={visibleProjects.map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        color: p.color,
        visibility: p.visibility,
        memberCount: p._count.members,
        cardCount: p._count.kanbanCards,
      }))}
      stats={{
        followers: t._count.followers,
        queueItems: t._count.queueItems,
        relays: t._count.relays,
        goals: t._count.goals,
      }}
      currentUserId={userId}
      isMember={isMember}
      isOwner={isOwner}
      isFollowing={isFollowing}
    />
  );
}
