export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

// POST /api/stripe/webhooks — Handle Stripe webhook events
export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    let event;

    // If webhook secret is configured, verify signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      // Parse without verification (development mode)
      event = JSON.parse(body);
    }

    console.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'account.updated': {
        // Connect account updated — check if onboarding completed
        const account = event.data.object;
        if (account.charges_enabled && account.payouts_enabled) {
          await prisma.user.updateMany({
            where: { stripeConnectAccountId: account.id },
            data: { stripeConnectOnboarded: true },
          });
          console.log(`Connect account ${account.id} onboarding complete`);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // Payment succeeded — update execution record
        const paymentIntent = event.data.object;
        const executionId = paymentIntent.metadata?.executionId;
        if (executionId) {
          await prisma.marketplaceExecution.updateMany({
            where: { id: executionId },
            data: { stripePaymentStatus: 'succeeded' },
          });
          console.log(`Payment for execution ${executionId} succeeded`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const executionId = paymentIntent.metadata?.executionId;
        if (executionId) {
          await prisma.marketplaceExecution.updateMany({
            where: { id: executionId },
            data: { stripePaymentStatus: 'failed' },
          });
          console.log(`Payment for execution ${executionId} failed`);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
