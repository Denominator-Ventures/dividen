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

// POST — create/publish a new agent from admin
export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { name, slug, description, longDescription, endpointUrl, category, pricingModel,
      pricePerTask, publishAsUserId, developerName, developerUrl, tags,
      supportsA2A, supportsMCP, inputFormat, outputFormat } = body;

    if (!name || !slug || !description || !endpointUrl) {
      return NextResponse.json({ error: 'name, slug, description, and endpointUrl are required' }, { status: 400 });
    }

    const existing = await prisma.marketplaceAgent.findUnique({ where: { slug } });
    if (existing) return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });

    // Determine developer — admin-published uses a specified user or creates with admin as developer
    let devId = publishAsUserId;
    let devName = developerName || 'DiviDen';
    if (publishAsUserId) {
      const user = await prisma.user.findUnique({ where: { id: publishAsUserId }, select: { name: true } });
      if (user) devName = developerName || user.name || 'DiviDen';
      else devId = null;
    }
    // If no user specified, use the admin user
    if (!devId) {
      const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } });
      devId = admin?.id || '';
    }
    if (!devId) return NextResponse.json({ error: 'No valid developer user found' }, { status: 400 });

    const agent = await prisma.marketplaceAgent.create({
      data: {
        name,
        slug,
        description,
        longDescription: longDescription || null,
        endpointUrl,
        category: category || 'general',
        pricingModel: pricingModel || 'free',
        pricePerTask: pricePerTask || null,
        developerId: devId,
        developerName: devName,
        developerUrl: developerUrl || null,
        tags: tags || null,
        supportsA2A: supportsA2A || false,
        supportsMCP: supportsMCP || false,
        inputFormat: inputFormat || 'text',
        outputFormat: outputFormat || 'text',
        status: 'active',
      },
    });

    return NextResponse.json({ success: true, agent: { id: agent.id, slug: agent.slug } });
  } catch (error) {
    console.error('Admin create agent error:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const allowed = new Set(['status', 'featured', 'developerName', 'developerUrl', 'name', 'description', 'category']);
    const safeUpdates: Record<string, any> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (allowed.has(k)) safeUpdates[k] = v;
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

// DELETE — permanently remove an agent
export async function DELETE(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await prisma.marketplaceAgent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete agent error:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
