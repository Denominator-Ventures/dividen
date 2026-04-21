export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * GET /api/marketplace-capabilities/[id] — Get detail (prompt hidden unless installed)
 * PATCH /api/marketplace-capabilities/[id] — Update customizations for installed capability
 * DELETE /api/marketplace-capabilities/[id] — Uninstall capability
 */

async function _GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const capability = await prisma.marketplaceCapability.findUnique({ where: { id: params.id } });
  if (!capability) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Check if installed by this user
  const userCap = await prisma.userCapability.findUnique({
    where: { userId_capabilityId: { userId, capabilityId: params.id } },
  });

  const isOwner = capability.createdByUserId === userId;

  return NextResponse.json({
    id: capability.id,
    name: capability.name,
    slug: capability.slug,
    description: capability.description,
    longDescription: capability.longDescription,
    icon: capability.icon,
    category: capability.category,
    tags: capability.tags,
    integrationType: capability.integrationType,
    pricingModel: capability.pricingModel,
    price: capability.price,
    editableFields: capability.editableFields,
    featured: capability.featured,
    totalPurchases: capability.totalPurchases,
    avgRating: capability.avgRating,
    totalRatings: capability.totalRatings,
    // Prompt is only visible if installed
    prompt: userCap?.status === 'active' ? capability.prompt : null,
    installed: userCap?.status === 'active',
    customizations: userCap?.customizations || null,
    resolvedPrompt: userCap?.resolvedPrompt || null,
    isOwner,
    hasAccessPassword: !!capability.accessPassword,
    accessPassword: isOwner ? capability.accessPassword : undefined,
  });
}

async function _PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await req.json();
  const { customizations } = body;

  // Must be installed
  const userCap = await prisma.userCapability.findUnique({
    where: { userId_capabilityId: { userId, capabilityId: params.id } },
    include: { capability: true },
  });

  if (!userCap || userCap.status !== 'active') {
    return NextResponse.json({ error: 'Capability not installed' }, { status: 404 });
  }

  // Resolve prompt with customizations
  let resolvedPrompt = userCap.capability.prompt;
  if (customizations && typeof customizations === 'object') {
    for (const [key, value] of Object.entries(customizations)) {
      resolvedPrompt = resolvedPrompt.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        String(value || `[not configured]`)
      );
    }
  }

  const updated = await prisma.userCapability.update({
    where: { id: userCap.id },
    data: {
      customizations: JSON.stringify(customizations),
      resolvedPrompt,
    },
  });

  return NextResponse.json({
    success: true,
    customizations: updated.customizations,
    resolvedPrompt: updated.resolvedPrompt,
  });
}

async function _DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;

  const userCap = await prisma.userCapability.findUnique({
    where: { userId_capabilityId: { userId, capabilityId: params.id } },
  });

  if (!userCap) return NextResponse.json({ error: 'Not installed' }, { status: 404 });

  await prisma.userCapability.update({
    where: { id: userCap.id },
    data: { status: 'disabled' },
  });

  return NextResponse.json({ success: true });
}

export const GET = withTelemetry(_GET);
export const PATCH = withTelemetry(_PATCH);
export const DELETE = withTelemetry(_DELETE);
