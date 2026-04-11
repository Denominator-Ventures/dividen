export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: List briefs for the current user
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const url = new URL(request.url);
  const cardId = url.searchParams.get('cardId');
  const relayId = url.searchParams.get('relayId');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  const where: any = { userId };
  if (cardId) where.sourceCardId = cardId;
  if (relayId) where.OR = [{ sourceRelayId: relayId }, { resultRelayId: relayId }];

  const briefs = await prisma.agentBrief.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 50),
  });

  return NextResponse.json({
    success: true,
    briefs: briefs.map((b: any) => ({
      ...b,
      sourceContactIds: b.sourceContactIds ? JSON.parse(b.sourceContactIds) : [],
      matchedSkills: b.matchedSkills ? JSON.parse(b.matchedSkills) : [],
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
  });
}
