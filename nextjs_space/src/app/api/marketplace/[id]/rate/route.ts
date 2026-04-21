export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

// POST /api/marketplace/[id]/rate — Rate an execution
async function _POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const body = await req.json();
    const { executionId, rating, feedback } = body;

    if (!executionId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'executionId and rating (1-5) required' }, { status: 400 });
    }

    const execution = await prisma.marketplaceExecution.findFirst({
      where: { id: executionId, agentId: params.id, userId },
    });

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    await prisma.marketplaceExecution.update({
      where: { id: executionId },
      data: { rating, feedback: feedback || null },
    });

    // Update agent average rating
    const agent = await prisma.marketplaceAgent.findUnique({ where: { id: params.id } });
    if (agent) {
      const newTotal = agent.totalRatings + (execution.rating ? 0 : 1); // only increment if first rating
      const oldSum = agent.avgRating * agent.totalRatings;
      const newSum = execution.rating
        ? oldSum - execution.rating + rating // replace old rating
        : oldSum + rating; // new rating
      
      await prisma.marketplaceAgent.update({
        where: { id: params.id },
        data: {
          avgRating: newTotal > 0 ? newSum / newTotal : 0,
          totalRatings: newTotal,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Marketplace rate error:', error);
    return NextResponse.json({ error: 'Failed to rate' }, { status: 500 });
  }
}

export const POST = withTelemetry(_POST);
