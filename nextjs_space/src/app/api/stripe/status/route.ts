export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { isStripeConfigured } from '@/lib/stripe';

// GET /api/stripe/status — Check if Stripe is configured
export async function GET(req: NextRequest) {
  return NextResponse.json({
    configured: isStripeConfigured(),
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
  });
}
