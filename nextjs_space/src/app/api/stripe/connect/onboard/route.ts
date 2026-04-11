export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// POST /api/stripe/connect/onboard — Create or resume Stripe Connect Express onboarding
export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
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

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || '';

    let accountId = user.stripeConnectAccountId;

    // Create Express account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        metadata: { dividenUserId: userId },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeConnectAccountId: accountId },
      });
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard?tab=marketplace&stripe=refresh`,
      return_url: `${origin}/dashboard?tab=marketplace&stripe=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url, accountId });
  } catch (error: any) {
    console.error('Stripe Connect onboard error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create onboarding link' }, { status: 500 });
  }
}
