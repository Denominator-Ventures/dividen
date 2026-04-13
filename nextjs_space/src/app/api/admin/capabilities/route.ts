export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  return authHeader.slice(7) === process.env.ADMIN_PASSWORD;
}

// GET /api/admin/capabilities — list all capabilities with stats
export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const capabilities = await prisma.marketplaceCapability.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { userCapabilities: true } },
      createdByUser: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: capabilities.map((c: any) => ({
      ...c,
      installCount: c._count.userCapabilities,
      _count: undefined,
    })),
  });
}

// POST /api/admin/capabilities — create a new capability
export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, slug, description, longDescription, icon, category, prompt, pricingModel, price, editableFields, tags, integrationType, featured, publishAsUserId, skillFormat, skillBody, skillSource } = body;

  if (!name || !slug || !description || !prompt) {
    return NextResponse.json({ error: 'name, slug, description, and prompt are required' }, { status: 400 });
  }

  // Determine publisher
  let publisherName = 'DiviDen';
  let publisherType = 'platform';
  let createdByUserId: string | undefined = undefined;

  if (publishAsUserId) {
    const targetUser = await prisma.user.findUnique({ where: { id: publishAsUserId } });
    if (targetUser) {
      publisherName = targetUser.name || targetUser.email;
      publisherType = 'user';
      createdByUserId = targetUser.id;
    }
  }

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
      status: 'active',
      approvalStatus: 'approved',
      publisherName,
      publisherType,
      ...(createdByUserId ? { createdByUserId } : {}),
      skillFormat: skillFormat || false,
      skillBody: skillBody || null,
      skillSource: skillSource || null,
    },
  });

  return NextResponse.json({ success: true, data: capability }, { status: 201 });
}

// PATCH /api/admin/capabilities — update a capability
export async function PATCH(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const allowedFields = ['name', 'description', 'longDescription', 'icon', 'category', 'prompt', 'pricingModel', 'price', 'editableFields', 'tags', 'integrationType', 'status', 'featured', 'approvalStatus', 'rejectionReason', 'publisherName', 'publisherType', 'publisherUrl', 'skillFormat', 'skillBody', 'skillSource'];
  const data: Record<string, any> = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  const updated = await prisma.marketplaceCapability.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/admin/capabilities — permanently remove a capability
export async function DELETE(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  // Remove user installs first
  await prisma.userCapability.deleteMany({ where: { capabilityId: id } });
  await prisma.marketplaceCapability.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
