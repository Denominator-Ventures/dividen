export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/contracts/[id] — Get contract detail
 * PATCH /api/contracts/[id] — Update contract status (complete, pause, cancel)
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const contract = await prisma.jobContract.findUnique({
    where: { id: params.id },
    include: {
      job: true,
      client: { select: { id: true, name: true, email: true } },
      worker: { select: { id: true, name: true, email: true } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  if (contract.clientId !== userId && contract.workerId !== userId) {
    return NextResponse.json({ error: 'Not a party to this contract' }, { status: 403 });
  }

  return NextResponse.json({ contract });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const contract = await prisma.jobContract.findUnique({ where: { id: params.id } });
  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  if (contract.clientId !== userId && contract.workerId !== userId) {
    return NextResponse.json({ error: 'Not a party to this contract' }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { status: newStatus } = body;
  const validTransitions: Record<string, string[]> = {
    active: ['paused', 'completed', 'cancelled'],
    paused: ['active', 'completed', 'cancelled'],
  };

  if (!newStatus || !validTransitions[contract.status]?.includes(newStatus)) {
    return NextResponse.json({ error: `Cannot transition from ${contract.status} to ${newStatus}` }, { status: 400 });
  }

  const data: any = { status: newStatus };
  if (newStatus === 'completed' || newStatus === 'cancelled') {
    data.endDate = new Date();
    // Also complete the parent job if completing the contract
    if (newStatus === 'completed') {
      await prisma.networkJob.update({
        where: { id: contract.jobId },
        data: { status: 'completed', completionNote: body.completionNote || null },
      }).catch(() => {});
    }
  }

  const updated = await prisma.jobContract.update({ where: { id: params.id }, data });
  return NextResponse.json({ contract: updated });
}
