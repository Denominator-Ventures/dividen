export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Admin Federation Management
 *
 * POST /api/admin/federation — Reset/rotate platform token for a federated instance
 *   Body: { baseUrl: string, action: 'reset_token' | 'toggle_active' | 'toggle_marketplace' }
 *
 * GET /api/admin/federation — List all instances with their tokens (admin-only)
 */

function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  return authHeader.slice(7) === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
