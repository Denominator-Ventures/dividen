export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/v2/federation/capabilities — Sync capabilities from a federated instance.
 * Self-hosted instances call this to push their capabilities so they appear on dividen.ai.
 *
 * Headers:
 *   Authorization: Bearer <platformToken>
 *
 * Body:
 *   capabilities: Array of CapabilitySyncPayload
 *
 * CapabilitySyncPayload:
 *   id              — required, remote capability ID
 *   name            — required
 *   description     — required
 *   prompt          — required, the system prompt (hidden until purchase)
 *   icon            — emoji icon (default ⚡)
 *   category        — classification
 *   tags            — JSON array or comma-separated
 *   integrationType — webhook pairing type
 *   pricingModel    — "free" | "one_time" | "subscription"
 *   price           — numeric price
 *   editableFields  — JSON array of customizable field names
 *   commands        — [{name, description, usage}]
 *   promptGroup     — logical grouping for prompt assembly
 *   signalPatterns  — JSON array of regex strings for relevance engine
 *   tokenEstimate   — estimated token count
 *   alwaysLoad      — boolean, bypass relevance scoring
 *   publisherName   — who published (defaults to instance name)
 *   accessPassword  — optional plain-text password for free access
 *
 * Approval: ALL capabilities go to pending_review regardless of instance trust.
 *
 * GET /api/v2/federation/capabilities — List capabilities synced from this instance.
 */

async function verifyFederatedInstance(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  return prisma.instanceRegistry.findFirst({
    where: { platformToken: token, platformLinked: true, isActive: true },
  });
}

export async function POST(req: NextRequest) {
  try {
    const instance = await verifyFederatedInstance(req);
    if (!instance) {
      return NextResponse.json({ error: 'Invalid or inactive platform token' }, { status: 401 });
    }
    if (!instance.marketplaceEnabled) {
      return NextResponse.json(
        { error: 'Marketplace not enabled for this instance. Call /api/v2/federation/marketplace-link first.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { capabilities } = body;
    if (!Array.isArray(capabilities) || capabilities.length === 0) {
      return NextResponse.json({ error: 'capabilities array is required' }, { status: 400 });
    }

    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!adminUser) {
      return NextResponse.json({ error: 'No admin user on managed platform' }, { status: 500 });
    }

    const results: any[] = [];

    const stringifyIfNeeded = (v: any): string | null => {
      if (!v) return null;
      return typeof v === 'string' ? v : JSON.stringify(v);
    };

    for (const cap of capabilities.slice(0, 50)) {
      if (!cap.name || !cap.id || !cap.prompt) {
        results.push({ remoteId: cap.id, status: 'skipped', reason: 'Missing name, id, or prompt' });
        continue;
      }

      try {
        const existing = await prisma.marketplaceCapability.findFirst({
          where: { sourceInstanceId: instance.id, remoteCapabilityId: cap.id },
        });

        const slug = `${instance.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${cap.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        const data: any = {
          name: cap.name,
          slug,
          description: cap.description || `Capability from ${instance.name}`,
          longDescription: cap.longDescription || null,
          icon: cap.icon || '⚡',
          prompt: cap.prompt,
          promptVersion: cap.promptVersion || '1.0',
          category: cap.category || 'custom',
          tags: stringifyIfNeeded(cap.tags),
          integrationType: cap.integrationType || null,
          pricingModel: cap.pricingModel || 'free',
          price: typeof cap.price === 'number' ? cap.price : null,
          editableFields: stringifyIfNeeded(cap.editableFields),
          accessPassword: cap.accessPassword || null,
          commands: stringifyIfNeeded(cap.commands),
          // CapabilityModule fields
          promptGroup: cap.promptGroup || null,
          signalPatterns: stringifyIfNeeded(cap.signalPatterns),
          tokenEstimate: typeof cap.tokenEstimate === 'number' ? cap.tokenEstimate : null,
          alwaysLoad: cap.alwaysLoad === true,
          // Publisher — use instance name, type = community for federated
          publisherName: cap.publisherName || instance.name,
          publisherType: 'community',
          publisherUrl: instance.baseUrl,
          // Approval — always pending_review
          approvalStatus: 'pending_review',
          status: 'active',
          createdByUserId: adminUser.id,
          // Federation tracking
          sourceInstanceId: instance.id,
          sourceInstanceUrl: instance.baseUrl,
          remoteCapabilityId: cap.id,
        };

        if (existing) {
          // Preserve existing approval status on updates
          const { approvalStatus: _omit, slug: _omitSlug, ...updateData } = data;
          await prisma.marketplaceCapability.update({ where: { id: existing.id }, data: updateData });
          results.push({
            remoteId: cap.id, name: cap.name, status: 'updated',
            marketplaceId: existing.id, approvalStatus: existing.approvalStatus,
          });
        } else {
          // Check slug collision
          const slugExists = await prisma.marketplaceCapability.findUnique({ where: { slug } });
          const finalSlug = slugExists ? `${slug}-${Date.now().toString(36)}` : slug;
          data.slug = finalSlug;

          const created = await prisma.marketplaceCapability.create({ data });
          results.push({
            remoteId: cap.id, name: cap.name, status: 'created',
            marketplaceId: created.id, approvalStatus: data.approvalStatus,
          });
        }
      } catch (err: any) {
        results.push({ remoteId: cap.id, status: 'error', reason: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      status: 'pending_review',
      instanceId: instance.id,
      synced: results.filter(r => r.status === 'created' || r.status === 'updated').length,
      total: results.length,
      results,
    });
  } catch (error: any) {
    console.error('POST /api/v2/federation/capabilities error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const instance = await verifyFederatedInstance(req);
    if (!instance) {
      return NextResponse.json({ error: 'Invalid platform token' }, { status: 401 });
    }

    const capabilities = await prisma.marketplaceCapability.findMany({
      where: { sourceInstanceId: instance.id },
      select: {
        id: true, name: true, slug: true, description: true,
        category: true, approvalStatus: true, pricingModel: true, price: true,
        promptGroup: true, signalPatterns: true, tokenEstimate: true, alwaysLoad: true,
        totalPurchases: true, avgRating: true, totalRatings: true,
        remoteCapabilityId: true,
        createdAt: true, updatedAt: true,
      },
    });

    return NextResponse.json({
      instanceId: instance.id,
      capabilities,
      total: capabilities.length,
    });
  } catch (error: any) {
    console.error('GET /api/v2/federation/capabilities error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
