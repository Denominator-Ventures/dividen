export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * GET /api/contracts — List contracts for the current user (as client or worker)
 */
async function _GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role'); // 'client' | 'worker' | null (both)
  const status = searchParams.get('status'); // 'active' | 'completed' | 'all'

  const where: any = {};
  if (role === 'client') where.clientId = userId;
  else if (role === 'worker') where.workerId = userId;
  else where.OR = [{ clientId: userId }, { workerId: userId }];

  if (status && status !== 'all') where.status = status;

  const contracts = await prisma.jobContract.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      job: { select: { id: true, title: true, taskType: true } },
      client: { select: { id: true, name: true, email: true } },
      worker: { select: { id: true, name: true, email: true } },
      payments: { orderBy: { createdAt: 'desc' }, take: 5 },
      _count: { select: { payments: true } },
    },
  });

  return NextResponse.json({ contracts });
}

export const GET = withTelemetry(_GET);
