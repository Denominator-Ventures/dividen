export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/teams/:id/billing — get billing details + spending policies
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId },
    });
    if (!membership) return NextResponse.json({ error: 'Not a team member' }, { status: 403 });

    const [billing, subscription, policies, team] = await Promise.all([
      prisma.teamBilling.findUnique({ where: { teamId: params.id } }),
      prisma.teamSubscription.findUnique({ where: { teamId: params.id } }),
      prisma.teamSpendingPolicy.findMany({
        where: { teamId: params.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.team.findUnique({
        where: { id: params.id },
        select: { isSelfHosted: true },
      }),
    ]);

    return NextResponse.json({
      billing,
      subscription,
      policies,
      isSelfHosted: team?.isSelfHosted ?? false,
    });
  } catch (error: any) {
    console.error('GET /api/teams/:id/billing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/teams/:id/billing — update billing settings (budget, etc.)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Only owner/admin can manage billing
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: { in: ['owner', 'admin'] } },
    });
    if (!membership) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const { monthlyBudget } = body;

    const billing = await prisma.teamBilling.upsert({
      where: { teamId: params.id },
      update: {
        monthlyBudget: monthlyBudget !== undefined ? monthlyBudget : undefined,
      },
      create: {
        teamId: params.id,
        monthlyBudget: monthlyBudget ?? null,
      },
    });

    return NextResponse.json(billing);
  } catch (error: any) {
    console.error('PUT /api/teams/:id/billing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/teams/:id/billing — create/update spending policy
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const membership = await prisma.teamMember.findFirst({
      where: { teamId: params.id, userId, role: { in: ['owner', 'admin'] } },
    });
    if (!membership) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const { action, policyId, type, targetId, limit, period } = body;

    if (action === 'delete' && policyId) {
      await prisma.teamSpendingPolicy.delete({
        where: { id: policyId, teamId: params.id },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'update' && policyId) {
      const policy = await prisma.teamSpendingPolicy.update({
        where: { id: policyId, teamId: params.id },
        data: {
          ...(limit !== undefined && { limit }),
          ...(period !== undefined && { period }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });
      return NextResponse.json(policy);
    }

    // Create new policy
    if (!type || limit === undefined) {
      return NextResponse.json({ error: 'type and limit are required' }, { status: 400 });
    }

    const policy = await prisma.teamSpendingPolicy.create({
      data: {
        teamId: params.id,
        type,
        targetId: targetId || null,
        limit,
        period: period || 'monthly',
      },
    });

    return NextResponse.json(policy);
  } catch (error: any) {
    console.error('POST /api/teams/:id/billing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
