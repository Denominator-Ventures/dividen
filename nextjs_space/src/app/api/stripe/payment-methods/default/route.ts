export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe';

// PUT /api/stripe/payment-methods/default — Set default payment method
export async function PUT(req: NextRequest) {
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
    const { paymentMethodId } = await req.json();

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'paymentMethodId is required' }, { status: 400 });
    }

    const customerId = await getOrCreateStripeCustomer(userId, email, session.user.name);

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Set default payment method error:', error);
    return NextResponse.json({ error: error.message || 'Failed to set default' }, { status: 500 });
  }
}
