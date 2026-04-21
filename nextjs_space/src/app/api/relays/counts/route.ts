export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

// GET /api/relays/counts — get relay counts for badge display
async function _GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const [pendingInbound, totalActive] = await Promise.all([
      prisma.agentRelay.count({
        where: {
          toUserId: userId,
          status: { in: ['pending', 'delivered', 'user_review'] },
        },
      }),
      prisma.agentRelay.count({
        where: {
          OR: [{ fromUserId: userId }, { toUserId: userId }],
          status: { notIn: ['completed', 'declined', 'expired'] },
        },
      }),
    ]);

    return NextResponse.json({ pendingInbound, totalActive });
  } catch (error: any) {
    console.error('GET /api/relays/counts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
