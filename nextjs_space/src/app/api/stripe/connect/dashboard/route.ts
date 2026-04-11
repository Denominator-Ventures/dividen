export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// POST /api/stripe/connect/dashboard — Get link to Stripe Express Dashboard
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
    if (!user?.stripeConnectAccountId) {
      return NextResponse.json({ error: 'No Stripe Connect account found' }, { status: 404 });
    }

    const loginLink = await stripe.accounts.createLoginLink(user.stripeConnectAccountId);
    return NextResponse.json({ url: loginLink.url });
  } catch (error: any) {
    console.error('Stripe Connect dashboard error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create dashboard link' }, { status: 500 });
  }
}
