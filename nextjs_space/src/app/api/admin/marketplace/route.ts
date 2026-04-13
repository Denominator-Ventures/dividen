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

    const allowed: Record<string, boolean> = {
      status: true, featured: true,
    };
    const safeUpdates: Record<string, any> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (allowed[k]) safeUpdates[k] = v;
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
