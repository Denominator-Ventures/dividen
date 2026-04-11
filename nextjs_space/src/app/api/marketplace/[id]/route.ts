export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/marketplace/[id] — Get agent detail
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const agent = await prisma.marketplaceAgent.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { subscriptions: true, executions: true } },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if user has an active subscription
    const subscription = await prisma.marketplaceSubscription.findUnique({
      where: { agentId_userId: { agentId: agent.id, userId } },
    });

    // Get user's recent executions
    const recentExecutions = await prisma.marketplaceExecution.findMany({
      where: { agentId: agent.id, userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, taskInput: true, taskOutput: true, status: true,
        responseTimeMs: true, rating: true, createdAt: true, completedAt: true,
      },
    });

    // Don't expose authToken to non-owners
    const isOwner = agent.developerId === userId;
    const { authToken, ...safeAgent } = agent;

    return NextResponse.json({
      ...safeAgent,
      isOwner,
      subscription: subscription || null,
      recentExecutions,
    });
  } catch (error: any) {
    console.error('Marketplace agent detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}

// PUT /api/marketplace/[id] — Update agent (owner only)
export async function PUT(
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
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    if (agent.developerId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};

    const allowedFields = [
      'name', 'description', 'longDescription', 'endpointUrl',
      'authMethod', 'authHeader', 'authToken',
      'developerName', 'developerUrl',
      'category', 'inputFormat', 'outputFormat',
      'pricingModel', 'pricePerTask', 'subscriptionPrice', 'taskLimit',
      'supportsA2A', 'supportsMCP', 'agentCardUrl', 'status',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.tags !== undefined) {
      updateData.tags = JSON.stringify(body.tags);
    }
    if (body.samplePrompts !== undefined) {
      updateData.samplePrompts = JSON.stringify(body.samplePrompts);
    }
    if (body.pricingDetails !== undefined) {
      updateData.pricingDetails = JSON.stringify(body.pricingDetails);
    }

    const updated = await prisma.marketplaceAgent.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Marketplace agent update error:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

// DELETE /api/marketplace/[id] — Remove agent (owner only)
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

    const agent = await prisma.marketplaceAgent.findUnique({ where: { id: params.id } });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    if (agent.developerId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await prisma.marketplaceAgent.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Marketplace agent delete error:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
