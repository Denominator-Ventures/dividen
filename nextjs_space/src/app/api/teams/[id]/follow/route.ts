export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/teams/:id/follow — follow a team
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Check team exists and is visible
    const team = await prisma.team.findFirst({
      where: {
        id: params.id,
        visibility: { in: ['network', 'public'] },
        isActive: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found or not visible' }, { status: 404 });
    }

    // Check if already following
    const existing = await prisma.teamFollow.findUnique({
      where: { userId_teamId: { userId, teamId: params.id } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already following this team' }, { status: 409 });
    }

    const follow = await prisma.teamFollow.create({
      data: { userId, teamId: params.id },
    });

    return NextResponse.json(follow, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/teams/:id/follow error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/teams/:id/follow — unfollow a team
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    await prisma.teamFollow.deleteMany({
      where: { userId, teamId: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/teams/:id/follow error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
