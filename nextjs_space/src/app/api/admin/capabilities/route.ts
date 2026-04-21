export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { withTelemetry } from '@/lib/telemetry';



// GET /api/admin/capabilities — list all capabilities with stats
async function _GET(req: NextRequest) {
  { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }

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
async function _POST(req: NextRequest) {
  { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }

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
async function _PATCH(req: NextRequest) {
  { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const allowedFields = ['name', 'description', 'longDescription', 'icon', 'category', 'prompt', 'pricingModel', 'price', 'editableFields', 'tags', 'integrationType', 'status', 'featured', 'approvalStatus', 'rejectionReason', 'reviewedById', 'reviewedAt', 'reviewNotes', 'publisherName', 'publisherType', 'publisherUrl', 'skillFormat', 'skillBody', 'skillSource'];
  const data: Record<string, any> = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  // Auto-set audit trail when approvalStatus changes
  if (updates.approvalStatus) {
    data.reviewedAt = new Date();
  }

  // Fetch the capability before update so we can notify the submitter + source instance
  const existing = updates.approvalStatus
    ? await prisma.marketplaceCapability.findUnique({
        where: { id },
        select: { createdByUserId: true, name: true, slug: true, sourceInstanceId: true },
      })
    : null;

  const updated = await prisma.marketplaceCapability.update({ where: { id }, data });

  // Notify submitter when approval status changes
  if (updates.approvalStatus && existing?.createdByUserId) {
    const statusLabel = updates.approvalStatus === 'approved' ? 'approved' : updates.approvalStatus === 'rejected' ? 'rejected' : updates.approvalStatus;
    await prisma.activityLog.create({
      data: {
        userId: existing.createdByUserId,
        action: 'marketplace_capability_reviewed',
        actor: 'system',
        summary: `Your capability "${existing.name}" has been ${statusLabel}.${updates.rejectionReason ? ` Reason: ${updates.rejectionReason}` : ''}`,
      },
    });
  }

  // Fire webhook to source instance if this is a federated capability
  if (updates.approvalStatus && existing?.sourceInstanceId) {
    notifySourceInstanceCapability(existing.sourceInstanceId, {
      event: 'capability_approval',
      capabilityId: id,
      name: existing.name,
      slug: existing.slug,
      status: updates.approvalStatus,
      reason: updates.rejectionReason || null,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/admin/capabilities — permanently remove a capability
async function _DELETE(req: NextRequest) {
  { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  // Remove user installs first
  await prisma.userCapability.deleteMany({ where: { capabilityId: id } });
  await prisma.marketplaceCapability.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

/**
 * Notify the source instance about a capability approval decision.
 * Looks up the instance by ID, fires webhook to /api/marketplace/webhook.
 */
async function notifySourceInstanceCapability(
  sourceInstanceId: string,
  payload: Record<string, any>,
): Promise<{ sent: boolean; error?: string }> {
  try {
    const instance = await prisma.instanceRegistry.findUnique({
      where: { id: sourceInstanceId },
      select: { baseUrl: true, apiKey: true },
    });
    if (!instance?.baseUrl) return { sent: false, error: 'Instance not found' };

    const webhookUrl = `${instance.baseUrl}/api/marketplace/webhook`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DiviDen-Event': 'capability_approval',
        'X-DiviDen-Source': 'marketplace',
        ...(instance.apiKey ? { 'X-Federation-Token': instance.apiKey } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[capability-approval-webhook] ${webhookUrl} returned ${response.status}`);
      return { sent: true, error: `HTTP ${response.status}` };
    }

    return { sent: true };
  } catch (err: any) {
    console.error('[capability-approval-webhook] Failed:', err.message);
    return { sent: false, error: err.message };
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
export const PATCH = withTelemetry(_PATCH);
export const DELETE = withTelemetry(_DELETE);
