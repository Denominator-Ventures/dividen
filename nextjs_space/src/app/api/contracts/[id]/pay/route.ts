export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateRecruitingFee } from '@/lib/recruiting-config';
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe';

/**
 * POST /api/contracts/[id]/pay — Record/initiate a payment for a recurring contract
 * Body: { amount?, periodStart?, periodEnd?, description?, paymentMethodId? }
 * 
 * For recurring contracts (hourly/weekly/monthly):
 *   - Client submits payment for a billing period
 *   - Creates JobPayment record
 *   - If Stripe is configured + client has payment method, creates PaymentIntent
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const contract = await prisma.jobContract.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      worker: true,
    },
  });
  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  if (contract.clientId !== userId) {
    return NextResponse.json({ error: 'Only the client can make payments' }, { status: 403 });
  }
  if (contract.status !== 'active') {
    return NextResponse.json({ error: 'Contract is not active' }, { status: 400 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // For recurring: amount defaults to contract rate
  const paymentAmount = body.amount ? parseFloat(body.amount) : contract.compensationAmount;
  if (!paymentAmount || paymentAmount <= 0) {
    return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
  }

  // Network transaction: client and worker are different users (cross-instance / marketplace)
  const isNetworkTransaction = contract.clientId !== contract.workerId;
  const { recruitingFee, workerPayout, feePercent } = calculateRecruitingFee(paymentAmount, isNetworkTransaction);

  // Create payment record
  const paymentData: any = {
    contractId: params.id,
    amount: paymentAmount,
    recruitingFee,
    workerPayout,
    feePercent,
    description: body.description || `${contract.compensationType} payment`,
    stripePaymentStatus: 'pending',
  };
  if (body.periodStart) paymentData.periodStart = new Date(body.periodStart);
  if (body.periodEnd) paymentData.periodEnd = new Date(body.periodEnd);

  // Try Stripe payment if configured
  if (stripe && contract.client.stripeCustomerId) {
    try {
      const paymentIntentData: any = {
        amount: Math.round(paymentAmount * 100),
        currency: contract.currency.toLowerCase(),
        customer: contract.client.stripeCustomerId,
        metadata: {
          contractId: params.id,
          jobId: contract.jobId,
          type: 'job_recruiting',
        },
        description: body.description || `Job contract payment — ${contract.compensationType}`,
      };

      // If worker has Connect, use destination charge
      if (contract.worker.stripeConnectAccountId && contract.worker.stripeConnectOnboarded) {
        paymentIntentData.transfer_data = { destination: contract.worker.stripeConnectAccountId };
        paymentIntentData.application_fee_amount = Math.round(recruitingFee * 100);
      }

      // If a specific payment method was provided, use it
      if (body.paymentMethodId) {
        paymentIntentData.payment_method = body.paymentMethodId;
        paymentIntentData.confirm = true;
        paymentIntentData.off_session = true;
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
      paymentData.stripePaymentIntentId = paymentIntent.id;
      paymentData.stripePaymentStatus = paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending';
    } catch (err: any) {
      console.error('Stripe payment failed:', err.message);
      // Still create the record — payment can be retried
    }
  }

  const payment = await prisma.jobPayment.create({ data: paymentData });

  // Update contract totals
  await prisma.jobContract.update({
    where: { id: params.id },
    data: {
      totalPaid: { increment: paymentAmount },
      totalRecruitingFee: { increment: recruitingFee },
      lastPaymentAt: new Date(),
    },
  });

  return NextResponse.json({
    payment,
    message: `Payment of $${paymentAmount.toFixed(2)} recorded. Recruiting fee: $${recruitingFee.toFixed(2)} (${feePercent}%).`,
  });
}
