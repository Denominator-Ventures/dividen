export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// GET /api/stripe/connect/status — Check Connect onboarding status
export async function GET(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ configured: false, onboarded: false, message: 'Stripe not configured' });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.stripeConnectAccountId) {
      return NextResponse.json({
        configured: true,
        hasAccount: false,
        onboarded: false,
      });
    }

    // Retrieve account from Stripe to check status
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    const isOnboarded = account.charges_enabled && account.payouts_enabled;

    // Update local cache if onboarding just completed
    if (isOnboarded && !user.stripeConnectOnboarded) {
      await prisma.user.update({
        where: { id: userId },
        data: { stripeConnectOnboarded: true },
      });
    }

    return NextResponse.json({
      configured: true,
      hasAccount: true,
      onboarded: isOnboarded,
      accountId: user.stripeConnectAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (error: any) {
    console.error('Stripe Connect status error:', error);
    return NextResponse.json({ error: error.message || 'Failed to check status' }, { status: 500 });
  }
}
