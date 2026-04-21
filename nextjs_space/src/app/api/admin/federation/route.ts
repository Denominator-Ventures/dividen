export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { requireAdmin } from '@/lib/admin-auth';


/**
 * Admin Federation Management
 *
 * POST /api/admin/federation — Reset/rotate platform token for a federated instance
 *   Body: { baseUrl: string, action: 'reset_token' | 'toggle_active' | 'toggle_marketplace' }
 *
 * GET /api/admin/federation — List all instances with their tokens (admin-only)
 */


export async function GET(req: NextRequest) {
  { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }

  const instances = await prisma.instanceRegistry.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, baseUrl: true,
      isActive: true, isTrusted: true,
      platformLinked: true, platformToken: true,
      marketplaceEnabled: true, discoveryEnabled: true,
      version: true, userCount: true, agentCount: true,
      lastSeenAt: true, lastSyncAt: true,
      createdAt: true, updatedAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    instances: instances.map(i => ({
      ...i,
      // Mask token — show first 12 chars only
      platformToken: i.platformToken ? `${i.platformToken.slice(0, 12)}...` : null,
    })),
    total: instances.length,
  });
}

export async function POST(req: NextRequest) {
  { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }

  try {
    const body = await req.json();
    const { baseUrl, instanceId, action } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    // Find instance by baseUrl or instanceId
    const instance = await prisma.instanceRegistry.findFirst({
      where: baseUrl
        ? { baseUrl: baseUrl.replace(/\/$/, '') }
        : instanceId
          ? { id: instanceId }
          : { id: 'impossible' },
    });

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    switch (action) {
      case 'reset_token': {
        // Generate a new platform token
        const newToken = `dvd_fed_${crypto.randomBytes(32).toString('hex')}`;
        await prisma.instanceRegistry.update({
          where: { id: instance.id },
          data: { platformToken: newToken },
        });
        return NextResponse.json({
          success: true,
          instanceId: instance.id,
          name: instance.name,
          baseUrl: instance.baseUrl,
          action: 'reset_token',
          newToken,
          message: `Platform token reset for ${instance.name}. The instance must re-register or be given this token manually.`,
        });
      }

      case 'toggle_active': {
        const newActive = !instance.isActive;
        await prisma.instanceRegistry.update({
          where: { id: instance.id },
          data: { isActive: newActive },
        });

        // Fire webhook to notify the instance about activation/deactivation
        notifyInstance(instance, 'instance_status', {
          event: 'instance_status',
          instanceId: instance.id,
          status: newActive ? 'active' : 'deactivated',
          timestamp: new Date().toISOString(),
        }).catch(() => {});

        return NextResponse.json({
          success: true,
          instanceId: instance.id,
          name: instance.name,
          isActive: newActive,
          message: `${instance.name} is now ${newActive ? 'active' : 'deactivated'}.`,
        });
      }

      case 'toggle_marketplace': {
        const newMarketplace = !instance.marketplaceEnabled;
        await prisma.instanceRegistry.update({
          where: { id: instance.id },
          data: { marketplaceEnabled: newMarketplace },
        });
        return NextResponse.json({
          success: true,
          instanceId: instance.id,
          name: instance.name,
          marketplaceEnabled: newMarketplace,
          message: `Marketplace ${newMarketplace ? 'enabled' : 'disabled'} for ${instance.name}.`,
        });
      }

      case 'toggle_trusted': {
        const newTrusted = !instance.isTrusted;
        await prisma.instanceRegistry.update({
          where: { id: instance.id },
          data: { isTrusted: newTrusted },
        });
        return NextResponse.json({
          success: true,
          instanceId: instance.id,
          name: instance.name,
          isTrusted: newTrusted,
          message: `${instance.name} trust status: ${newTrusted ? 'trusted' : 'untrusted'}.`,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('POST /api/admin/federation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Fire a webhook notification to a federated instance.
 * Used for instance_status events (activation/deactivation).
 * Fire-and-forget — errors are logged but never block the admin action.
 */
async function notifyInstance(
  instance: { id: string; baseUrl: string; apiKey?: string | null; platformToken?: string | null },
  eventType: string,
  payload: Record<string, any>,
): Promise<{ sent: boolean; error?: string }> {
  try {
    if (!instance.baseUrl) return { sent: false, error: 'No baseUrl' };

    const webhookUrl = `${instance.baseUrl}/api/marketplace/webhook`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DiviDen-Event': eventType,
        'X-DiviDen-Source': 'federation',
        ...(instance.apiKey ? { 'X-Federation-Token': instance.apiKey } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[federation-webhook] ${webhookUrl} returned ${response.status}`);
      return { sent: true, error: `HTTP ${response.status}` };
    }

    return { sent: true };
  } catch (err: any) {
    console.error(`[federation-webhook] Failed for ${instance.baseUrl}:`, err.message);
    return { sent: false, error: err.message };
  }
}
