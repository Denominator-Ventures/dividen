export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * GET /api/jobs/earnings — Get job earnings for current user
 * Returns contracts where user is the worker, with payment summaries.
 */
async function _GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  // Get contracts where user is the worker
  const contracts = await prisma.jobContract.findMany({
    where: { workerId: userId },
    include: {
      job: {
        select: {
          id: true, title: true, compensationType: true,
          compensationAmount: true, compensationCurrency: true,
          status: true, posterId: true,
          poster: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Also get contracts where user is the client (poster)
  const clientContracts = await prisma.jobContract.findMany({
    where: { clientId: userId },
    include: {
      job: {
        select: {
          id: true, title: true, compensationType: true,
          compensationAmount: true, compensationCurrency: true, status: true,
        },
      },
      worker: { select: { id: true, name: true, email: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate totals for worker role
  let totalEarned = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let totalFees = 0;

  for (const c of contracts) {
    for (const p of c.payments) {
      if (p.stripePaymentStatus === 'succeeded') {
        totalPaid += p.workerPayout;
        totalFees += p.recruitingFee;
      } else if (p.stripePaymentStatus === 'pending') {
        totalPending += p.workerPayout;
      }
      totalEarned += p.workerPayout;
    }
  }

  // Calculate totals for client role
  let totalSpent = 0;
  let totalClientFees = 0;
  for (const c of clientContracts) {
    for (const p of c.payments) {
      if (p.stripePaymentStatus === 'succeeded') {
        totalSpent += p.amount;
        totalClientFees += p.recruitingFee;
      }
    }
  }

  return NextResponse.json({
    success: true,
    asWorker: {
      contracts: contracts.map((c: any) => ({
        ...c,
        totalPaid: c.payments.filter((p: any) => p.stripePaymentStatus === 'succeeded').reduce((s: any, p: any) => s + p.workerPayout, 0),
        totalPending: c.payments.filter((p: any) => p.stripePaymentStatus === 'pending').reduce((s: any, p: any) => s + p.workerPayout, 0),
      })),
      totals: {
        totalContracts: contracts.length,
        activeContracts: contracts.filter((c: any) => c.status === 'active').length,
        totalEarned,
        totalPaid,
        totalPending,
        totalFees,
      },
    },
    asClient: {
      contracts: clientContracts.map((c: any) => ({
        ...c,
        totalPaid: c.payments.filter((p: any) => p.stripePaymentStatus === 'succeeded').reduce((s: any, p: any) => s + p.amount, 0),
      })),
      totals: {
        totalContracts: clientContracts.length,
        totalSpent,
        totalFees: totalClientFees,
      },
    },
  });
}

export const GET = withTelemetry(_GET);
