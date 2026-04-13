export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  return authHeader.slice(7) === process.env.ADMIN_PASSWORD;
}

// GET — list all capabilities with stats
export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const capabilities = await prisma.marketplaceCapability.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { userCapabilities: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });

    const active = capabilities.filter(c => c.status === 'active' && c.approvalStatus === 'approved').length;
    const pendingReview = capabilities.filter(c => c.approvalStatus === 'pending_review').length;
    const rejected = capabilities.filter(c => c.approvalStatus === 'rejected').length;
    const disabled = capabilities.filter(c => c.status === 'disabled').length;
    const skills = capabilities.filter(c => c.skillFormat).length;
    const totalInstalls = capabilities.reduce((sum, c) => sum + c.totalPurchases, 0);

    return NextResponse.json({
      capabilities: capabilities.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        category: c.category,
        status: c.status,
        approvalStatus: c.approvalStatus,
        rejectionReason: c.rejectionReason,
        featured: c.featured,
        pricingModel: c.pricingModel,
        price: c.price,
        publisherName: c.publisherName,
        publisherType: c.publisherType,
        publisherUrl: c.publisherUrl,
        skillFormat: c.skillFormat,
        skillSource: c.skillSource,
        isSystemSeed: c.isSystemSeed,
        totalPurchases: c.totalPurchases,
        avgRating: c.avgRating,
        totalRatings: c.totalRatings,
        createdByUser: c.createdByUser,
        installs: c._count.userCapabilities,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      totals: { total: capabilities.length, active, pendingReview, rejected, disabled, skills, totalInstalls },
    });
  } catch (error) {
    console.error('Admin capabilities error:', error);
    return NextResponse.json({ error: 'Failed to fetch capabilities' }, { status: 500 });
  }
}

// POST — create a new capability (admin-published)
export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { name, slug, description, longDescription, icon, category, prompt, pricingModel, price,
      editableFields, tags, integrationType, featured, publisherName, publisherType, publisherUrl,
      skillFormat, skillSource, skillBody, publishAsUserId, commands } = body;

    if (!name || !slug || !description || !prompt) {
      return NextResponse.json({ error: 'name, slug, description, and prompt are required' }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await prisma.marketplaceCapability.findUnique({ where: { slug } });
    if (existing) return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });

    const capability = await prisma.marketplaceCapability.create({
      data: {
        name,
        slug,
        description,
        longDescription: longDescription || null,
        icon: icon || '⚡',
        category: category || 'operations',
        prompt,
        pricingModel: pricingModel || 'free',
        price: price || null,
        editableFields: editableFields || null,
        tags: tags || null,
        integrationType: integrationType || null,
        featured: featured || false,
        commands: commands || null,
        publisherName: publisherName || 'DiviDen',
        publisherType: publisherType || 'platform',
        publisherUrl: publisherUrl || null,
        skillFormat: skillFormat || false,
        skillSource: skillSource || null,
        skillBody: skillBody || null,
        status: 'active',
        approvalStatus: 'approved',
        isSystemSeed: false,
        createdByUserId: publishAsUserId || null,
      },
    });

    return NextResponse.json({ success: true, capability: { id: capability.id, slug: capability.slug } });
  } catch (error) {
    console.error('Admin create capability error:', error);
    return NextResponse.json({ error: 'Failed to create capability' }, { status: 500 });
  }
}

// PATCH — update capability (status, approval, featured, unpublish, etc.)
export async function PATCH(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const allowed = new Set([
      'status', 'approvalStatus', 'rejectionReason', 'featured',
      'name', 'description', 'longDescription', 'icon', 'category',
      'prompt', 'pricingModel', 'price', 'editableFields', 'tags',
      'integrationType', 'publisherName', 'publisherType', 'publisherUrl',
      'skillFormat', 'skillSource', 'skillBody', 'commands',
    ]);
    const safeUpdates: Record<string, any> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (allowed.has(k)) safeUpdates[k] = v;
    }

    const updated = await prisma.marketplaceCapability.update({
      where: { id },
      data: safeUpdates,
    });

    return NextResponse.json({
      success: true,
      capability: { id: updated.id, status: updated.status, approvalStatus: updated.approvalStatus, featured: updated.featured },
    });
  } catch (error) {
    console.error('Admin update capability error:', error);
    return NextResponse.json({ error: 'Failed to update capability' }, { status: 500 });
  }
}

// DELETE — permanently remove a capability
export async function DELETE(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Delete user capabilities first (cascade doesn't auto-work on some setups)
    await prisma.userCapability.deleteMany({ where: { capabilityId: id } });
    await prisma.marketplaceCapability.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete capability error:', error);
    return NextResponse.json({ error: 'Failed to delete capability' }, { status: 500 });
  }
}
