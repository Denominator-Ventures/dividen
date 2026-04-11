export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/marketplace/[id]/subscribe — Subscribe to an agent
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

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

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = existing
      ? await prisma.marketplaceSubscription.update({
          where: { id: existing.id },
          data: {
            status: 'active',
            tasksUsed: 0,
            taskLimit: agent.taskLimit,
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
            taskLimit: agent.taskLimit,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });

    return NextResponse.json(sub, { status: 201 });
  } catch (error: any) {
    console.error('Marketplace subscribe error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

// DELETE /api/marketplace/[id]/subscribe — Unsubscribe
export async function DELETE(
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

    await prisma.marketplaceSubscription.update({
      where: { id: sub.id },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Marketplace unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
