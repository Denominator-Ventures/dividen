export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe';
import { withTelemetry } from '@/lib/telemetry';

// GET /api/stripe/payment-methods — List saved payment methods
async function _GET(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ configured: false, paymentMethods: [] });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const email = (session.user as any).email;

    const customerId = await getOrCreateStripeCustomer(userId, email, session.user.name);

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    // Get default payment method
    const customer = await stripe.customers.retrieve(customerId) as any;
    const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method || null;

    return NextResponse.json({
      configured: true,
      paymentMethods: paymentMethods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPaymentMethodId,
      })),
      defaultPaymentMethodId,
    });
  } catch (error: any) {
    console.error('List payment methods error:', error);
    return NextResponse.json({ error: error.message || 'Failed to list payment methods' }, { status: 500 });
  }
}

// POST /api/stripe/payment-methods — Create a SetupIntent to add a new card
async function _POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const email = (session.user as any).email;

    const customerId = await getOrCreateStripeCustomer(userId, email, session.user.name);

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: { dividenUserId: userId },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId,
    });
  } catch (error: any) {
    console.error('Create setup intent error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create setup intent' }, { status: 500 });
  }
}

// DELETE /api/stripe/payment-methods — Remove a payment method
async function _DELETE(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) {
      return NextResponse.json({ error: 'paymentMethodId is required' }, { status: 400 });
    }

    // Verify ownership
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    const userId = (session.user as any).id;
    const email = (session.user as any).email;
    const customerId = await getOrCreateStripeCustomer(userId, email, session.user.name);

    if (pm.customer !== customerId) {
      return NextResponse.json({ error: 'Not authorized to remove this payment method' }, { status: 403 });
    }

    await stripe.paymentMethods.detach(paymentMethodId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Remove payment method error:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove payment method' }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
export const DELETE = withTelemetry(_DELETE);
