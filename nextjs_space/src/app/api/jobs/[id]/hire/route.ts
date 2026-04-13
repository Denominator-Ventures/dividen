export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRecruitingFeePercent, calculateRecruitingFee } from '@/lib/recruiting-config';
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe';

/**
 * POST /api/jobs/[id]/hire — Assign a contributor, create contract, set up dual projects
 * Body: { applicantId, compensationType?, compensationAmount?, compensationCurrency? }
 * 
 * Flow:
 *   1. Poster gets an oversight project on their board (or links to existing)
 *   2. Contributor gets an execution project on their board with task breakdown
 *   3. Both become project members on their respective projects
 *   4. For paid tasks: contract + payment flow
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
  const application = job.applications.find((a: any) => a.applicantId === applicantId);
  if (!application) return NextResponse.json({ error: 'Applicant not found for this job' }, { status: 404 });

  // Use job compensation or override from body
  const compType = body.compensationType || job.compensationType;
  const compAmount = body.compensationAmount ? parseFloat(body.compensationAmount) : job.compensationAmount;
  const compCurrency = body.compensationCurrency || job.compensationCurrency || 'USD';
  const isPaid = !!compType && compType !== 'volunteer' && !!compAmount && compAmount > 0;

  const feePercent = getRecruitingFeePercent();

  // Parse task breakdown if provided
  let taskBreakdown: { title: string; description?: string; priority?: number; dueDate?: string }[] = [];
  try {
    if (job.taskBreakdown) taskBreakdown = JSON.parse(job.taskBreakdown);
  } catch {}

  // Start transaction: update job, create contract, create dual projects
  const result = await prisma.$transaction(async (tx: any) => {
    // Accept the application, reject others
    await tx.jobApplication.update({
      where: { id: application.id },
      data: { status: 'accepted' },
    });
    await tx.jobApplication.updateMany({
      where: { jobId: params.id, id: { not: application.id } },
      data: { status: 'rejected' },
    });

    // Create contract if it's a paid task
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

    // ── Poster's project (oversight) ──
    // If job already has a posterProject (task posted from existing project), use it
    let posterProject = job.projectId
      ? await tx.project.findUnique({ where: { id: job.projectId } })
      : null;

    if (!posterProject) {
      posterProject = await tx.project.create({
        data: {
          name: job.title,
          description: job.description,
          status: 'active',
          visibility: 'private',
          createdById: userId,
          metadata: JSON.stringify({ sourceJobId: params.id, role: 'poster' }),
        },
      });
      // Add poster as lead
      await tx.projectMember.create({
        data: { projectId: posterProject.id, userId, role: 'lead' },
      });
    }

    // Create oversight kanban card on poster's board
    await tx.kanbanCard.create({
      data: {
        title: `Manage: ${job.title}`,
        description: `Oversight for task assigned to contributor. Track deliverables and review submissions.`,
        status: 'in_progress',
        priority: 2,
        userId,
        projectId: posterProject.id,
        checklist: {
          create: [
            { title: 'Review initial delivery', sortOrder: 0, assigneeType: 'self' },
            { title: 'Provide feedback / request revisions', sortOrder: 1, assigneeType: 'self' },
            { title: 'Approve final delivery', sortOrder: 2, assigneeType: 'self' },
            ...(isPaid ? [{ title: 'Release payment', sortOrder: 3, assigneeType: 'self' as const }] : []),
          ],
        },
      },
    });

    // ── Contributor's project (execution) ──
    const contributorProject = await tx.project.create({
      data: {
        name: job.title,
        description: job.description,
        status: 'active',
        visibility: 'private',
        createdById: applicantId,
        metadata: JSON.stringify({ sourceJobId: params.id, role: 'contributor', posterUserId: userId }),
      },
    });
    // Add contributor as lead on their own project
    await tx.projectMember.create({
      data: { projectId: contributorProject.id, userId: applicantId, role: 'lead' },
    });

    // Create execution kanban card(s) on contributor's board
    if (taskBreakdown.length > 0) {
      // Structured task breakdown provided
      for (const task of taskBreakdown) {
        await tx.kanbanCard.create({
          data: {
            title: task.title,
            description: task.description || '',
            status: 'not_started',
            priority: task.priority ?? 3,
            userId: applicantId,
            projectId: contributorProject.id,
            ...(task.dueDate ? { dueDate: new Date(task.dueDate) } : {}),
          },
        });
      }
    } else {
      // No breakdown — create a single card from the job description
      await tx.kanbanCard.create({
        data: {
          title: job.title,
          description: job.description,
          status: 'in_progress',
          priority: 2,
          userId: applicantId,
          projectId: contributorProject.id,
          ...(job.deadline ? { dueDate: job.deadline } : {}),
        },
      });
    }

    // Update job with both project links + status
    await tx.networkJob.update({
      where: { id: params.id },
      data: {
        status: 'in_progress',
        assigneeId: applicantId,
        compensationType: compType || job.compensationType,
        compensationAmount: compAmount ?? job.compensationAmount,
        isPaid,
        projectId: posterProject.id,
        contributorProjectId: contributorProject.id,
      },
    });

    return { contract, posterProject, contributorProject };
  });

  // For flat-fee paid jobs with Stripe: create payment intent immediately
  let paymentInfo = null;
  if (isPaid && compType === 'flat' && compAmount && result.contract && stripe) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.stripeCustomerId) {
        // Network: poster and applicant are different users
        const { recruitingFee, workerPayout } = calculateRecruitingFee(compAmount, true);

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
    posterProject: result.posterProject,
    contributorProject: result.contributorProject,
    payment: paymentInfo,
    message: isPaid
      ? `Assigned! Agreement created with ${feePercent}% platform fee. Projects created on both boards.`
      : `Assigned! Projects created on both boards. No payment required.`,
  });
}
