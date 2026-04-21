export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateRevenueSplit } from '@/lib/marketplace-config';
import { withTelemetry } from '@/lib/telemetry';

/**
 * GET /api/marketplace-capabilities — Browse available capabilities
 * POST /api/marketplace-capabilities — Install (purchase) a capability
 */

async function _GET(req: NextRequest) {
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
            signalPatterns: true, tokenEstimate: true, alwaysLoad: true, moduleVersion: true,
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
        signalPatterns: uc.capability.signalPatterns,
        tokenEstimate: uc.capability.tokenEstimate,
        alwaysLoad: uc.capability.alwaysLoad,
        moduleVersion: uc.capability.moduleVersion,
        status: uc.status,
        installedAt: uc.installedAt.toISOString(),
        lastUsedAt: uc.lastUsedAt?.toISOString() || null,
      })),
    });
  }

  // Browse marketplace capabilities — only show approved items
  const where: any = { status: 'active', approvalStatus: 'approved' };
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
        accessPassword: true,   // needed to compute hasAccessPassword
        createdByUserId: true,  // needed to compute isOwner
        publisherName: true,
        publisherType: true,
        publisherUrl: true,
        skillFormat: true,
        skillSource: true,
        // CapabilityModule Phase 2 fields
        signalPatterns: true,
        tokenEstimate: true,
        alwaysLoad: true,
        moduleVersion: true,
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
      const isOwner = c.createdByUserId === userId;
      const { accessPassword, createdByUserId, ...safeFields } = c;
      return {
        ...safeFields,
        installed: installedIds.has(c.id),
        integrationConnected: hasIntegration,
        hasAccessPassword: !!accessPassword,
        isOwner,
        // Owner sees the actual password; others just see hasAccessPassword
        accessPassword: isOwner ? accessPassword : undefined,
      };
    }),
  });
}

async function _POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await req.json();

  // ── Branch: Create a custom capability ───────────────────────────────────
  if (body.action === 'create') {
    const { name, description, icon, category, tags, integrationType, pricingModel, price, prompt, editableFields, accessPassword, commands, signalPatterns, tokenEstimate, alwaysLoad } = body;
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
        accessPassword: accessPassword || null,
        commands: commands ? (typeof commands === 'string' ? commands : JSON.stringify(commands)) : null,
        // CapabilityModule Phase 2 fields
        signalPatterns: signalPatterns ? (typeof signalPatterns === 'string' ? signalPatterns : JSON.stringify(signalPatterns)) : null,
        tokenEstimate: typeof tokenEstimate === 'number' ? tokenEstimate : null,
        alwaysLoad: alwaysLoad === true,
        createdByUserId: userId,
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
  const { capabilityId, accessPassword: submittedPassword } = body;
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

  // Password bypass: if paid and user provides correct access password, treat as free
  const isPaid = capability.pricingModel === 'one_time' && (capability.price || 0) > 0;
  const passwordGranted = isPaid && capability.accessPassword && submittedPassword === capability.accessPassword;

  // Purchase gating: paid capabilities require payment or valid password
  if (isPaid && !passwordGranted) {
    return NextResponse.json({
      error: 'Payment required. This capability costs $' + (capability.price || 0).toFixed(2) + '. Complete purchase or enter the developer access password to install.',
      code: 'PAYMENT_REQUIRED',
      price: capability.price,
      hasAccessPassword: !!capability.accessPassword,
    }, { status: 402 });
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
    update: { status: 'active', installedAt: new Date(), paidAt: isPaid ? new Date() : null, passwordUnlocked: !!passwordGranted },
    create: {
      userId,
      capabilityId,
      status: 'active',
      resolvedPrompt: capability.prompt, // Start with base prompt
      paidAt: isPaid ? new Date() : null,
      passwordUnlocked: !!passwordGranted,
    },
  });

  // Increment purchase count + track revenue (97/3 split applies to paid capabilities)
  const grossAmount = isPaid && !passwordGranted ? (capability.price || 0) : 0;
  const revSplit = grossAmount > 0
    ? calculateRevenueSplit(grossAmount, true) // network transaction — 3% floor enforced
    : { grossAmount: 0, platformFee: 0, developerPayout: 0, feePercent: 0 };

  await prisma.marketplaceCapability.update({
    where: { id: capabilityId },
    data: {
      totalPurchases: { increment: 1 },
      ...(grossAmount > 0 ? {
        totalGrossRevenue: { increment: revSplit.grossAmount },
        totalPlatformFees: { increment: revSplit.platformFee },
        totalDeveloperPayout: { increment: revSplit.developerPayout },
      } : {}),
    },
  });

  return NextResponse.json({
    success: true,
    userCapability: {
      id: userCap.id,
      capabilityId,
      name: capability.name,
      prompt: capability.prompt, // Now visible
      editableFields: capability.editableFields,
      signalPatterns: capability.signalPatterns,
    },
    ...(grossAmount > 0 ? {
      revenue: {
        gross: revSplit.grossAmount,
        developerPayout: revSplit.developerPayout,
        platformFee: revSplit.platformFee,
        feePercent: revSplit.feePercent,
      },
    } : {}),
  }, { status: 201 });
}

// PUT /api/marketplace-capabilities — Submit a user-created capability for review
async function _PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json();
  const { name, slug, description, longDescription, icon, category, prompt, tags, integrationType, editableFields, signalPatterns, tokenEstimate, alwaysLoad } = body;

  if (!name || !slug || !description || !prompt) {
    return NextResponse.json({ error: 'name, slug, description, and prompt are required' }, { status: 400 });
  }

  // Check slug uniqueness
  const existing = await prisma.marketplaceCapability.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: 'A capability with this slug already exists' }, { status: 409 });
  }

  const capability = await prisma.marketplaceCapability.create({
    data: {
      name,
      slug,
      description,
      longDescription: longDescription || null,
      icon: icon || '⚡',
      category: category || 'custom',
      prompt,
      tags: tags || null,
      integrationType: integrationType || null,
      editableFields: editableFields || null,
      // CapabilityModule Phase 2 fields
      signalPatterns: signalPatterns ? (typeof signalPatterns === 'string' ? signalPatterns : JSON.stringify(signalPatterns)) : null,
      tokenEstimate: typeof tokenEstimate === 'number' ? tokenEstimate : null,
      alwaysLoad: alwaysLoad === true,
      pricingModel: 'free',
      status: 'active',
      approvalStatus: 'pending_review',
      publisherName: user.name || user.email,
      publisherType: 'user',
      createdByUserId: userId,
    },
  });

  // Notify admin about new submission (fire-and-forget)
  prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } }).then((admin) => {
    const adminId = admin?.id || userId;
    prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'marketplace_submission',
        summary: `⚡ New capability "${capability.name}" submitted for review by ${user.name || user.email}`,
        metadata: JSON.stringify({ capabilityId: capability.id, capabilityName: capability.name, submittedBy: userId, type: 'capability' }),
      },
    }).catch(() => {});
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    data: capability,
    message: 'Capability submitted for review. It will be visible in the Bubble Store once approved.',
  }, { status: 201 });
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
export const PUT = withTelemetry(_PUT);
