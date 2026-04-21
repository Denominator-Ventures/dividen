export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

// POST /api/marketplace/[id]/subscribe — Subscribe to an agent
// Body: { accessPassword?: string } — if agent has a password and it matches, grant free access
async function _POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body is fine for free agents */ }

    const agent = await prisma.marketplaceAgent.findUnique({ where: { id: params.id } });
    if (!agent || agent.status !== 'active') {
      return NextResponse.json({ error: 'Agent not found or not active' }, { status: 404 });
    }

    // Check existing subscription
    const existing = await prisma.marketplaceSubscription.findUnique({
      where: { agentId_userId: { agentId: agent.id, userId } },
    });

    if (existing && existing.status === 'active') {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 409 });
    }

    // For paid agents, check if user provided the correct access password for free access
    const isPaid = agent.pricingModel !== 'free';
    const passwordGranted = isPaid && agent.accessPassword && body.accessPassword === agent.accessPassword;

    // If agent is paid and no valid password, require normal subscription flow
    // (Free agents and password-unlocked agents proceed directly)
    if (isPaid && !passwordGranted) {
      // Allow subscription — payment is handled at execution time for per_task,
      // or could be gated here for subscription model in the future
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = existing
      ? await prisma.marketplaceSubscription.update({
          where: { id: existing.id },
          data: {
            status: 'active',
            tasksUsed: 0,
            taskLimit: passwordGranted ? null : agent.taskLimit, // password = unlimited
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelledAt: null,
          },
        })
      : await prisma.marketplaceSubscription.create({
          data: {
            agentId: agent.id,
            userId,
            status: 'active',
            taskLimit: passwordGranted ? null : agent.taskLimit, // password = unlimited
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });

    return NextResponse.json({ ...sub, passwordGranted: !!passwordGranted }, { status: 201 });
  } catch (error: any) {
    console.error('Marketplace subscribe error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

// DELETE /api/marketplace/[id]/subscribe — Unsubscribe
async function _DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const sub = await prisma.marketplaceSubscription.findUnique({
      where: { agentId_userId: { agentId: params.id, userId } },
    });

    if (!sub) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    // If agent was installed, also uninstall — Divi forgets when access is lost
    const wasInstalled = sub.installed;

    await prisma.marketplaceSubscription.update({
      where: { id: sub.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        installed: false,
        uninstalledAt: wasInstalled ? new Date() : sub.uninstalledAt,
      },
    });

    // Clear memory entries if was installed
    if (wasInstalled) {
      await prisma.memoryItem.deleteMany({
        where: { userId, key: { startsWith: `agent:${params.id}` } },
      });
    }

    return NextResponse.json({ success: true, wasInstalled });
  } catch (error: any) {
    console.error('Marketplace unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}

export const POST = withTelemetry(_POST);
export const DELETE = withTelemetry(_DELETE);
