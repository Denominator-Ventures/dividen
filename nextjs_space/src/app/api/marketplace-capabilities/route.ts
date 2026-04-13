export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/marketplace-capabilities — Browse available capabilities
 * POST /api/marketplace-capabilities — Install (purchase) a capability
 */

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search');
  const installed = url.searchParams.get('installed'); // "true" = only show user's installed

  if (installed === 'true') {
    // Return user's installed capabilities with customization data
    const userCaps = await prisma.userCapability.findMany({
      where: { userId, status: 'active' },
      include: {
        capability: {
          select: {
            id: true, name: true, slug: true, description: true, icon: true,
            category: true, tags: true, integrationType: true,
            editableFields: true, prompt: true, promptVersion: true,
            pricingModel: true, price: true,
          },
        },
      },
      orderBy: { installedAt: 'desc' },
    });

    return NextResponse.json({
      capabilities: userCaps.map(uc => ({
        id: uc.capability.id,
        userCapabilityId: uc.id,
        name: uc.capability.name,
        slug: uc.capability.slug,
        description: uc.capability.description,
        icon: uc.capability.icon,
        category: uc.capability.category,
        tags: uc.capability.tags,
        integrationType: uc.capability.integrationType,
        editableFields: uc.capability.editableFields,
        prompt: uc.capability.prompt, // visible because purchased
        customizations: uc.customizations,
        resolvedPrompt: uc.resolvedPrompt,
        status: uc.status,
        installedAt: uc.installedAt.toISOString(),
        lastUsedAt: uc.lastUsedAt?.toISOString() || null,
      })),
    });
  }

  // Browse marketplace capabilities
  const where: any = { status: 'active' };
  if (category && category !== 'all') where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [capabilities, userInstalled] = await Promise.all([
    prisma.marketplaceCapability.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { totalPurchases: 'desc' }],
      select: {
        id: true, name: true, slug: true, description: true, longDescription: true,
        icon: true, category: true, tags: true, integrationType: true,
        pricingModel: true, price: true, editableFields: true,
        status: true, featured: true, totalPurchases: true,
        avgRating: true, totalRatings: true,
        // NOTE: prompt is NOT included — hidden until purchased
      },
    }),
    prisma.userCapability.findMany({
      where: { userId, status: 'active' },
      select: { capabilityId: true },
    }),
  ]);

  const installedIds = new Set(userInstalled.map(uc => uc.capabilityId));

  return NextResponse.json({
    capabilities: capabilities.map(c => ({
      ...c,
      installed: installedIds.has(c.id),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await req.json();
  const { capabilityId } = body;

  if (!capabilityId) return NextResponse.json({ error: 'capabilityId is required' }, { status: 400 });

  // Check capability exists
  const capability = await prisma.marketplaceCapability.findUnique({ where: { id: capabilityId } });
  if (!capability || capability.status !== 'active') {
    return NextResponse.json({ error: 'Capability not found or unavailable' }, { status: 404 });
  }

  // Check if already installed
  const existing = await prisma.userCapability.findUnique({
    where: { userId_capabilityId: { userId, capabilityId } },
  });
  if (existing && existing.status === 'active') {
    return NextResponse.json({ error: 'Already installed' }, { status: 409 });
  }

  // Install (upsert in case it was previously disabled)
  const userCap = await prisma.userCapability.upsert({
    where: { userId_capabilityId: { userId, capabilityId } },
    update: { status: 'active', installedAt: new Date() },
    create: {
      userId,
      capabilityId,
      status: 'active',
      resolvedPrompt: capability.prompt, // Start with base prompt
    },
  });

  // Increment purchase count
  await prisma.marketplaceCapability.update({
    where: { id: capabilityId },
    data: { totalPurchases: { increment: 1 } },
  });

  return NextResponse.json({
    success: true,
    userCapability: {
      id: userCap.id,
      capabilityId,
      name: capability.name,
      prompt: capability.prompt, // Now visible
      editableFields: capability.editableFields,
    },
  }, { status: 201 });
}
