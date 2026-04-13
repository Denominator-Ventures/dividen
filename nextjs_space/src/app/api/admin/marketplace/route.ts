export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  return authHeader.slice(7) === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const agents = await prisma.marketplaceAgent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { subscriptions: true, executions: true } },
      },
    });

    const active = agents.filter((a) => a.status === 'active').length;
    const pending = agents.filter((a) => a.status === 'pending').length;
    const featured = agents.filter((a) => a.featured).length;
    const totalExecutions = agents.reduce((sum, a) => sum + a.totalExecutions, 0);
    const totalRevenue = agents.reduce((sum, a) => sum + a.totalGrossRevenue, 0);
    const totalPlatformFees = agents.reduce((sum, a) => sum + a.totalPlatformFees, 0);

    return NextResponse.json({
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        description: a.description,
        category: a.category,
        status: a.status,
        featured: a.featured,
        pricingModel: a.pricingModel,
        pricePerTask: a.pricePerTask,
        totalExecutions: a.totalExecutions,
        avgRating: a.avgRating,
        totalRatings: a.totalRatings,
        successRate: a.successRate,
        totalGrossRevenue: a.totalGrossRevenue,
        totalPlatformFees: a.totalPlatformFees,
        developerName: a.developerName,
        developerUrl: a.developerUrl,
        endpointUrl: a.endpointUrl,
        supportsA2A: a.supportsA2A,
        supportsMCP: a.supportsMCP,
        version: a.version,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        _count: a._count,
      })),
      totals: { total: agents.length, active, pending, featured, totalExecutions, totalRevenue, totalPlatformFees },
    });
  } catch (error) {
    console.error('Admin marketplace error:', error);
    return NextResponse.json({ error: 'Failed to fetch marketplace' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const allowed = ['status', 'featured', 'developerName', 'developerUrl', 'name', 'description', 'category'];
    const safeUpdates: Record<string, any> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (allowed.includes(k)) safeUpdates[k] = v;
    }

    const updated = await prisma.marketplaceAgent.update({
      where: { id },
      data: safeUpdates,
    });

    return NextResponse.json({ success: true, agent: { id: updated.id, status: updated.status, featured: updated.featured } });
  } catch (error) {
    console.error('Admin marketplace update error:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

// POST /api/admin/marketplace — create and publish a new agent
export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { name, slug, description, category, pricingModel, pricePerTask, endpointUrl, supportsA2A, supportsMCP, publishAsUserId } = body;

    if (!name || !slug || !description) {
      return NextResponse.json({ error: 'name, slug, and description are required' }, { status: 400 });
    }

    // Determine developer attribution
    let developerName = 'DiviDen';
    let developerUrl: string | null = 'https://dividen.ai';
    let listedById: string | undefined;

    if (publishAsUserId) {
      const targetUser = await prisma.user.findUnique({ where: { id: publishAsUserId } });
      if (targetUser) {
        developerName = targetUser.name || targetUser.email;
        developerUrl = null;
        listedById = targetUser.id;
      }
    }

    const agent = await prisma.marketplaceAgent.create({
      data: {
        name,
        slug,
        description,
        category: category || 'general',
        pricingModel: pricingModel || 'free',
        pricePerTask: pricePerTask || 0,
        endpointUrl: endpointUrl || null,
        supportsA2A: supportsA2A || false,
        supportsMCP: supportsMCP || false,
        developerName,
        developerUrl,
        status: 'active',
        ...(listedById ? { listedBy: { connect: { id: listedById } } } : {}),
      },
    });

    return NextResponse.json({ success: true, agent }, { status: 201 });
  } catch (error) {
    console.error('Admin marketplace create error:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

// DELETE /api/admin/marketplace — permanently remove an agent
export async function DELETE(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // Remove subscriptions and executions first
    await prisma.marketplaceSubscription.deleteMany({ where: { agentId: id } });
    await prisma.marketplaceExecution.deleteMany({ where: { agentId: id } });
    await prisma.marketplaceAgent.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin marketplace delete error:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
