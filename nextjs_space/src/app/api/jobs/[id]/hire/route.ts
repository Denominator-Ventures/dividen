export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRecruitingFeePercent, calculateRecruitingFee } from '@/lib/recruiting-config';
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe';

/**
 * POST /api/jobs/[id]/hire — Hire an applicant, create contract, initiate payment
 * Body: { applicantId, compensationType?, compensationAmount?, compensationCurrency? }
 * 
 * For paid jobs:
 *   - If poster has Stripe payment methods, creates a PaymentIntent with recruiting fee
 *   - For flat-fee: single charge on hire
 *   - For recurring: creates contract, first payment triggered separately
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const job = await prisma.networkJob.findUnique({
    where: { id: params.id },
    include: { applications: true },
  });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.posterId !== userId) return NextResponse.json({ error: 'Only the job poster can hire' }, { status: 403 });
  if (job.status !== 'open') return NextResponse.json({ error: 'Job is no longer open' }, { status: 400 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { applicantId } = body;
  if (!applicantId) return NextResponse.json({ error: 'applicantId is required' }, { status: 400 });

  // Verify applicant exists and has applied
  const application = job.applications.find(a => a.applicantId === applicantId);
  if (!application) return NextResponse.json({ error: 'Applicant not found for this job' }, { status: 404 });

  // Use job compensation or override from body
  const compType = body.compensationType || job.compensationType;
  const compAmount = body.compensationAmount ? parseFloat(body.compensationAmount) : job.compensationAmount;
  const compCurrency = body.compensationCurrency || job.compensationCurrency || 'USD';
  const isPaid = !!compType && compType !== 'volunteer' && !!compAmount && compAmount > 0;

  const feePercent = getRecruitingFeePercent();

  // Start transaction: update job, create contract, update application
  const result = await prisma.$transaction(async (tx) => {
    // Update job status and assignee
    await tx.networkJob.update({
      where: { id: params.id },
      data: {
        status: 'in_progress',
        assigneeId: applicantId,
        compensationType: compType || job.compensationType,
        compensationAmount: compAmount ?? job.compensationAmount,
        isPaid,
      },
    });

    // Accept the application, reject others
    await tx.jobApplication.update({
      where: { id: application.id },
      data: { status: 'accepted' },
    });
    await tx.jobApplication.updateMany({
      where: { jobId: params.id, id: { not: application.id } },
      data: { status: 'rejected' },
    });

    // Create contract if it's a paid job
    let contract = null;
    if (isPaid && compType && compAmount) {
      contract = await tx.jobContract.create({
        data: {
          jobId: params.id,
          clientId: userId,
          workerId: applicantId,
          compensationType: compType,
          compensationAmount: compAmount,
          currency: compCurrency,
          recruitingFeePercent: feePercent,
          status: 'active',
        },
      });
    }

    // Auto-create Project from the job (jobs are "special projects")
    const project = await tx.project.create({
      data: {
        name: job.title,
        description: job.description,
        status: 'active',
        visibility: 'private',
        createdById: userId,
        metadata: JSON.stringify({ sourceJobId: params.id, type: 'job_project' }),
      },
    });

    // Link job to project
    await tx.networkJob.update({
      where: { id: params.id },
      data: { projectId: project.id },
    });

    // Add poster as project lead
    await tx.projectMember.create({
      data: { projectId: project.id, userId, role: 'lead' },
    });

    // Add hired person as contributor
    await tx.projectMember.create({
      data: { projectId: project.id, userId: applicantId, role: 'contributor' },
    });

    return { contract, project };
  });

  // For flat-fee paid jobs with Stripe: create payment intent immediately
  let paymentInfo = null;
  if (isPaid && compType === 'flat' && compAmount && result.contract && stripe) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.stripeCustomerId) {
        const { recruitingFee, workerPayout } = calculateRecruitingFee(compAmount);

        // Check if worker has Stripe Connect
        const worker = await prisma.user.findUnique({ where: { id: applicantId } });
        
        const paymentIntentData: any = {
          amount: Math.round(compAmount * 100), // cents
          currency: compCurrency.toLowerCase(),
          customer: user.stripeCustomerId,
          metadata: {
            contractId: result.contract.id,
            jobId: params.id,
            type: 'job_recruiting',
          },
          description: `Job: ${job.title} — Flat fee`,
        };

        // If worker has Connect account, use destination charges
        if (worker?.stripeConnectAccountId && worker.stripeConnectOnboarded) {
          paymentIntentData.transfer_data = { destination: worker.stripeConnectAccountId };
          paymentIntentData.application_fee_amount = Math.round(recruitingFee * 100);
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

        // Create payment record
        await prisma.jobPayment.create({
          data: {
            contractId: result.contract.id,
            amount: compAmount,
            recruitingFee,
            workerPayout,
            feePercent,
            description: 'Flat fee',
            stripePaymentIntentId: paymentIntent.id,
            stripePaymentStatus: 'pending',
          },
        });

        // Update contract with payment intent
        await prisma.jobContract.update({
          where: { id: result.contract.id },
          data: {
            stripePaymentIntentId: paymentIntent.id,
            stripePaymentStatus: 'pending',
          },
        });

        paymentInfo = {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: compAmount,
          recruitingFee,
          workerPayout,
        };
      }
    } catch (err: any) {
      console.error('Stripe payment creation failed:', err.message);
      // Don't fail the hire — contract is created, payment can happen later
    }
  }

  return NextResponse.json({
    success: true,
    contract: result.contract,
    project: result.project,
    payment: paymentInfo,
    message: isPaid
      ? `Hired! Contract created with ${feePercent}% recruiting fee. Project "${result.project.name}" created.`
      : `Hired! Project "${result.project.name}" created. No payment required.`,
  });
}
