export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/teams — list teams for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            connection: { select: { id: true, peerUserName: true, peerUserEmail: true, peerInstanceUrl: true } },
          },
        },
        _count: { select: { projects: true, queueItems: true, relays: true, followers: true } },
        subscription: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(teams);
  } catch (error: any) {
    console.error('GET /api/teams error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/teams — create a new team
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const { name, description, avatar, type, visibility, headline, website, location, industry, foundedAt, tier } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Start everyone on a 14-day Pro trial so they can experience the full feature set
    const { getSubscriptionDefaults } = await import('@/lib/feature-gates');
    const trialDefaults = getSubscriptionDefaults('pro');

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description || null,
        avatar: avatar || null,
        type: type || 'work',
        visibility: visibility || 'private',
        headline: headline || null,
        website: website || null,
        location: location || null,
        industry: industry || null,
        foundedAt: foundedAt ? new Date(foundedAt) : null,
        createdById: userId,
        members: {
          create: { userId, role: 'owner' },
        },
        // Create a 14-day Team Pro trial automatically
        subscription: {
          create: {
            ...trialDefaults,
            currentMembers: 1,
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        subscription: true,
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/teams error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
