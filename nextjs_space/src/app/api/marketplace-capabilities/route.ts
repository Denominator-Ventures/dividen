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

  const [capabilities, userInstalled, userWebhooks, userBuiltins, userServiceKeys] = await Promise.all([
    prisma.marketplaceCapability.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { totalPurchases: 'desc' }],
      select: {
        id: true, name: true, slug: true, description: true, longDescription: true,
        icon: true, category: true, tags: true, integrationType: true,
        pricingModel: true, price: true, editableFields: true,
        status: true, featured: true, totalPurchases: true,
        avgRating: true, totalRatings: true,
        isSystemSeed: true,
        // NOTE: prompt is NOT included — hidden until purchased
      },
    }),
    prisma.userCapability.findMany({
      where: { userId, status: 'active' },
      select: { capabilityId: true },
    }),
    prisma.webhook.findMany({
      where: { userId, isActive: true },
      select: { type: true },
    }),
    prisma.agentCapability.findMany({
      where: { userId, status: 'enabled' },
      select: { type: true },
    }),
    prisma.serviceApiKey.findMany({
      where: { userId },
      select: { service: true },
    }),
  ]);

  // Build set of connected integration types
  const connectedIntegrations = new Set<string>();
  for (const w of userWebhooks) connectedIntegrations.add(w.type);
  for (const b of userBuiltins) {
    connectedIntegrations.add(b.type);
    if (b.type === 'meetings') connectedIntegrations.add('calendar');
  }
  for (const s of userServiceKeys) connectedIntegrations.add(s.service.toLowerCase());

  const installedIds = new Set(userInstalled.map(uc => uc.capabilityId));

  return NextResponse.json({
    capabilities: capabilities.map(c => {
      const needsIntegration = c.integrationType && c.integrationType !== 'generic';
      const hasIntegration = needsIntegration
        ? connectedIntegrations.has(c.integrationType!) || connectedIntegrations.has(c.integrationType === 'calendar' ? 'meetings' : c.integrationType!)
        : true;
      return {
        ...c,
        installed: installedIds.has(c.id),
        integrationConnected: hasIntegration,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await req.json();

  // ── Branch: Create a custom capability ───────────────────────────────────
  if (body.action === 'create') {
    const { name, description, icon, category, tags, integrationType, pricingModel, price, prompt, editableFields } = body;
    if (!name || !description || !prompt) {
      return NextResponse.json({ error: 'name, description, and prompt are required' }, { status: 400 });
    }
    // Enforce pricing
    if (pricingModel && !['free', 'one_time'].includes(pricingModel)) {
      return NextResponse.json({ error: 'pricingModel must be "free" or "one_time"' }, { status: 400 });
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    // Check slug uniqueness
    const existingSlug = await prisma.marketplaceCapability.findUnique({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now().toString(36)}` : slug;

    const capability = await prisma.marketplaceCapability.create({
      data: {
        name,
        slug: finalSlug,
        description,
        icon: icon || '⚡',
        category: category || 'custom',
        tags: tags || null,
        integrationType: integrationType || null,
        pricingModel: pricingModel || 'free',
        price: pricingModel === 'one_time' ? (price || 0) : 0,
        prompt,
        editableFields: editableFields || '[]',
        status: 'active',
        isSystemSeed: false,
      },
    });

    // Auto-install for the creator
    const userCap = await prisma.userCapability.create({
      data: {
        userId,
        capabilityId: capability.id,
        status: 'active',
        resolvedPrompt: prompt,
      },
    });

    return NextResponse.json({
      success: true,
      capability: { id: capability.id, name: capability.name, slug: capability.slug },
      userCapability: { id: userCap.id },
    }, { status: 201 });
  }

  // ── Branch: Install an existing capability ──────────────────────────────
  const { capabilityId } = body;
  if (!capabilityId) return NextResponse.json({ error: 'capabilityId is required' }, { status: 400 });

  // Check capability exists
  const capability = await prisma.marketplaceCapability.findUnique({ where: { id: capabilityId } });
  if (!capability || capability.status !== 'active') {
    return NextResponse.json({ error: 'Capability not found or unavailable' }, { status: 404 });
  }

  // Enforce pricing: only free or one_time
  if (capability.pricingModel === 'subscription') {
    return NextResponse.json({ error: 'Subscription pricing is not supported. Capabilities must be free or one-time purchase.' }, { status: 400 });
  }

  // Integration gating: if capability requires a specific integration, verify user has it connected
  if (capability.integrationType && capability.integrationType !== 'generic') {
    const intType = capability.integrationType; // "email" | "calendar" | "slack" | "crm" | "payments" | "transcript"
    
    // Check webhooks matching the integration type
    const hasWebhook = await prisma.webhook.findFirst({
      where: { userId, type: intType, isActive: true },
    });
    
    // Check built-in agent capabilities (email, meetings map to calendar)
    const capType = intType === 'calendar' ? 'meetings' : intType;
    const hasBuiltin = await prisma.agentCapability.findFirst({
      where: { userId, type: capType, status: 'enabled' },
    });
    
    // Check service API keys for integration types like "slack", "crm"
    const hasServiceKey = await prisma.serviceApiKey.findFirst({
      where: { userId, service: { contains: intType, mode: 'insensitive' } },
    });
    
    if (!hasWebhook && !hasBuiltin && !hasServiceKey) {
      const integrationLabel = intType.charAt(0).toUpperCase() + intType.slice(1);
      return NextResponse.json({
        error: `This capability requires an active ${integrationLabel} integration. Connect ${integrationLabel} in Settings → Integrations first.`,
        code: 'INTEGRATION_REQUIRED',
        requiredIntegration: intType,
      }, { status: 422 });
    }
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
