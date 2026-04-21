export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateRevenueSplit } from '@/lib/marketplace-config';
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe';
import { withTelemetry } from '@/lib/telemetry';

/**
 * POST /api/marketplace/[id]/execute/[executionId] — Approve or decline a dynamic price quote.
 *
 * Two-phase dynamic pricing flow:
 *   1. Agent returns a result with a price quote (pricingPhase = 'quoted')
 *   2. User sees the quote in a checkout widget
 *   3. User POSTs here with action: 'approve' or 'decline'
 *   4. If approved, payment is processed and execution is finalized
 *
 * Body:
 *   action: 'approve' | 'decline'
 *   paymentMethodId?: string  // optional Stripe payment method
 *
 * GET — Get execution details including quote status.
 */
async function _POST(
  req: NextRequest,
  { params }: { params: { id: string; executionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const userEmail = (session.user as any).email;

    const body = await req.json();
    const { action, paymentMethodId } = body;

    if (!action || !['approve', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "decline"' }, { status: 400 });
    }

    // Fetch execution and verify ownership
    const execution = await prisma.marketplaceExecution.findUnique({
      where: { id: params.executionId },
      include: {
        agent: {
          include: { developer: { select: { stripeConnectAccountId: true, stripeConnectOnboarded: true } } },
        },
      },
    });

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }
    if (execution.userId !== userId) {
      return NextResponse.json({ error: 'Not your execution' }, { status: 403 });
    }
    if (execution.agentId !== params.id) {
      return NextResponse.json({ error: 'Agent mismatch' }, { status: 400 });
    }
    if (execution.pricingPhase !== 'quoted') {
      return NextResponse.json({ error: `Cannot ${action} an execution in phase: ${execution.pricingPhase}` }, { status: 400 });
    }

    if (action === 'decline') {
      await prisma.marketplaceExecution.update({
        where: { id: execution.id },
        data: { pricingPhase: 'declined' },
      });
      return NextResponse.json({
        success: true,
        executionId: execution.id,
        pricingPhase: 'declined',
        message: 'Quote declined. No charge will be applied.',
      });
    }

    // === Approve flow ===
    const quoteAmount = execution.quoteAmount || 0;
    const revSplit = calculateRevenueSplit(quoteAmount, true); // network transaction

    let stripePaymentIntentId: string | null = null;

    // Process Stripe payment if there's a charge
    if (quoteAmount > 0 && stripe && execution.agent.developer?.stripeConnectAccountId && execution.agent.developer?.stripeConnectOnboarded) {
      try {
        const customerId = await getOrCreateStripeCustomer(userId, userEmail, session.user.name);
        const customer = await stripe.customers.retrieve(customerId) as any;
        const pmId = paymentMethodId || customer.invoice_settings?.default_payment_method;

        if (pmId) {
          const amountInCents = Math.round(quoteAmount * 100);
          const platformFeeInCents = Math.round(revSplit.platformFee * 100);

          const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: execution.quoteCurrency?.toLowerCase() || 'usd',
            customer: customerId,
            payment_method: pmId,
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
            application_fee_amount: platformFeeInCents,
            transfer_data: { destination: execution.agent.developer.stripeConnectAccountId },
            metadata: {
              executionId: execution.id,
              agentId: execution.agentId,
              agentName: execution.agent.name,
              userId,
              pricingPhase: 'dynamic_approved',
            },
            description: `DiviDen: ${execution.agent.name} dynamic quote`,
          });

          stripePaymentIntentId = paymentIntent.id;
        }
      } catch (paymentError: any) {
        console.error(`Stripe payment failed for dynamic quote ${execution.id}:`, paymentError.message);
      }
    }

    // Update execution with approval and revenue
    await prisma.marketplaceExecution.update({
      where: { id: execution.id },
      data: {
        pricingPhase: 'approved',
        approvedAt: new Date(),
        grossAmount: revSplit.grossAmount,
        platformFee: revSplit.platformFee,
        developerPayout: revSplit.developerPayout,
        feePercent: revSplit.feePercent,
        stripePaymentIntentId,
        stripePaymentStatus: stripePaymentIntentId ? 'succeeded' : (quoteAmount > 0 ? 'pending' : null),
      },
    });

    // Update agent revenue accumulators
    if (revSplit.grossAmount > 0) {
      await prisma.marketplaceAgent.update({
        where: { id: execution.agentId },
        data: {
          totalGrossRevenue: { increment: revSplit.grossAmount },
          totalPlatformFees: { increment: revSplit.platformFee },
          totalDeveloperPayout: { increment: revSplit.developerPayout },
          pendingPayout: { increment: revSplit.developerPayout },
        },
      });
    }

    return NextResponse.json({
      success: true,
      executionId: execution.id,
      pricingPhase: 'approved',
      charged: revSplit.grossAmount,
      revenue: revSplit.grossAmount > 0 ? {
        gross: revSplit.grossAmount,
        developerPayout: revSplit.developerPayout,
        platformFee: revSplit.platformFee,
      } : undefined,
      message: quoteAmount > 0
        ? `Quote approved. $${quoteAmount.toFixed(2)} charged.`
        : 'Quote approved. No charge (free result).',
    });
  } catch (error: any) {
    console.error('POST /marketplace/[id]/execute/[executionId] error:', error);
    return NextResponse.json({ error: 'Failed to process quote action' }, { status: 500 });
  }
}

async function _GET(
  req: NextRequest,
  { params }: { params: { id: string; executionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const execution = await prisma.marketplaceExecution.findUnique({
      where: { id: params.executionId },
      select: {
        id: true, status: true, pricingPhase: true,
        quoteAmount: true, quoteCurrency: true, quoteMetadata: true, quotedAt: true, approvedAt: true,
        grossAmount: true, platformFee: true, developerPayout: true,
        taskInput: true, taskOutput: true,
        responseTimeMs: true, createdAt: true, completedAt: true,
        stripePaymentStatus: true,
        agent: { select: { id: true, name: true, developerName: true, pricingModel: true } },
      },
    });

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }
    if (execution.agent.id !== params.id) {
      return NextResponse.json({ error: 'Agent mismatch' }, { status: 400 });
    }

    return NextResponse.json({ success: true, execution });
  } catch (error: any) {
    console.error('GET /marketplace/[id]/execute/[executionId] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
