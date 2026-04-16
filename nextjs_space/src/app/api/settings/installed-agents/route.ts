export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/settings/installed-agents — Return user's installed marketplace agents
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;

  try {
    const subscriptions = await prisma.marketplaceSubscription.findMany({
      where: { userId, status: 'active', installed: true },
      include: {
        agent: {
          select: {
            id: true, name: true, slug: true, description: true,
            category: true, status: true, developerName: true,
          },
        },
      },
      orderBy: { installedAt: 'desc' },
    });

    const agents = subscriptions.map(sub => ({
      id: sub.agent.id,
      subscriptionId: sub.id,
      name: sub.agent.name,
      slug: sub.agent.slug,
      description: sub.agent.description,
      icon: '\uD83E\uDD16', // robot emoji
      category: sub.agent.category,
      status: sub.agent.status,
      installedAt: sub.installedAt?.toISOString() || sub.createdAt.toISOString(),
    }));

    return NextResponse.json({ agents });
  } catch (error: any) {
    console.error('Failed to fetch installed agents:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
