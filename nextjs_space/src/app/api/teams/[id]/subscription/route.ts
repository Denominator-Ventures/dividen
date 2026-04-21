export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSubscriptionDefaults } from '@/lib/feature-gates';
import { withTelemetry } from '@/lib/telemetry';

// GET /api/teams/:id/subscription — get subscription status
async function _GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Must be a team member to view subscription
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId },
    });
    if (!membership) return NextResponse.json({ error: 'Not a team member' }, { status: 403 });

    const subscription = await prisma.teamSubscription.findUnique({
      where: { teamId: params.id },
    });

    if (!subscription) {
      return NextResponse.json({ hasSubscription: false, tier: null });
    }

    // Check if trial has expired
    const isTrialExpired = subscription.status === 'trialing' && 
      subscription.trialEndsAt && 
      new Date() > subscription.trialEndsAt;

    return NextResponse.json({
      hasSubscription: true,
      ...subscription,
      isTrialExpired,
      daysRemaining: subscription.trialEndsAt 
        ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null,
    });
  } catch (error: any) {
    console.error('GET /api/teams/:id/subscription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/teams/:id/subscription — upgrade/downgrade subscription
async function _PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Only owner can manage subscription
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: 'owner' },
    });
    if (!membership) return NextResponse.json({ error: 'Only team owner can manage subscription' }, { status: 403 });

    const body = await req.json();
    const { action, tier } = body;

    const existing = await prisma.teamSubscription.findUnique({
      where: { teamId: params.id },
    });

    if (action === 'upgrade' && tier === 'pro') {
      if (!existing) {
        // Create new pro subscription
        const defaults = getSubscriptionDefaults('pro');
        const sub = await prisma.teamSubscription.create({
          data: {
            teamId: params.id,
            ...defaults,
            currentMembers: await prisma.teamMember.count({ where: { teamId: params.id } }),
          },
        });
        return NextResponse.json(sub);
      }

      // Upgrade existing to pro
      const sub = await prisma.teamSubscription.update({
        where: { teamId: params.id },
        data: {
          tier: 'pro',
          memberLimit: 10,
          monthlyPrice: 79,
          perSeatPrice: 9,
        },
      });
      return NextResponse.json(sub);
    }

    if (action === 'downgrade' && tier === 'starter') {
      if (!existing) {
        return NextResponse.json({ error: 'No subscription to downgrade' }, { status: 400 });
      }

      // Check member count fits within starter limit
      const memberCount = await prisma.teamMember.count({ where: { teamId: params.id } });
      if (memberCount > 5) {
        return NextResponse.json({ 
          error: `Team has ${memberCount} members. Starter plan supports up to 5. Remove members before downgrading.` 
        }, { status: 400 });
      }

      // Check project count fits within starter limit
      const projectCount = await prisma.project.count({
        where: { teamId: params.id, status: { not: 'archived' } },
      });
      if (projectCount > 3) {
        return NextResponse.json({ 
          error: `Team has ${projectCount} active projects. Starter plan supports up to 3. Archive projects before downgrading.` 
        }, { status: 400 });
      }

      const sub = await prisma.teamSubscription.update({
        where: { teamId: params.id },
        data: {
          tier: 'starter',
          memberLimit: 5,
          monthlyPrice: 29,
          perSeatPrice: null,
        },
      });

      // Disable team agent on downgrade
      await prisma.team.update({
        where: { id: params.id },
        data: { agentEnabled: false },
      });

      return NextResponse.json(sub);
    }

    if (action === 'cancel') {
      if (!existing) {
        return NextResponse.json({ error: 'No subscription to cancel' }, { status: 400 });
      }

      const sub = await prisma.teamSubscription.update({
        where: { teamId: params.id },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
        },
      });

      // Disable team agent on cancel
      await prisma.team.update({
        where: { id: params.id },
        data: { agentEnabled: false },
      });

      return NextResponse.json(sub);
    }

    if (action === 'reactivate') {
      if (!existing || existing.status !== 'canceled') {
        return NextResponse.json({ error: 'No canceled subscription to reactivate' }, { status: 400 });
      }

      const sub = await prisma.teamSubscription.update({
        where: { teamId: params.id },
        data: {
          status: 'active',
          canceledAt: null,
          billingCycleStart: new Date(),
        },
      });

      return NextResponse.json(sub);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('PUT /api/teams/:id/subscription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
export const PUT = withTelemetry(_PUT);
