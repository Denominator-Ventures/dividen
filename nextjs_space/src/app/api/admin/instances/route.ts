export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  return authHeader.slice(7) === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const instances = await prisma.instanceRegistry.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const active = instances.filter((i) => i.isActive).length;
    const trusted = instances.filter((i) => i.isTrusted).length;
    const platformLinked = instances.filter((i) => i.platformLinked).length;
    const totalUsers = instances.reduce((sum, i) => sum + (i.userCount || 0), 0);
    const totalAgents = instances.reduce((sum, i) => sum + (i.agentCount || 0), 0);

    return NextResponse.json({
      instances: instances.map((i) => ({
        id: i.id,
        name: i.name,
        baseUrl: i.baseUrl,
        isActive: i.isActive,
        isTrusted: i.isTrusted,
        lastSeenAt: i.lastSeenAt?.toISOString() || null,
        platformLinked: i.platformLinked,
        marketplaceEnabled: i.marketplaceEnabled,
        discoveryEnabled: i.discoveryEnabled,
        updatesEnabled: i.updatesEnabled,
        version: i.version,
        userCount: i.userCount,
        agentCount: i.agentCount,
        lastSyncAt: i.lastSyncAt?.toISOString() || null,
        createdAt: i.createdAt.toISOString(),
      })),
      totals: { total: instances.length, active, trusted, platformLinked, totalUsers, totalAgents },
    });
  } catch (error) {
    console.error('Admin instances error:', error);
    return NextResponse.json({ error: 'Failed to fetch instances' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { name, baseUrl, apiKey } = body;
    if (!name || !baseUrl) return NextResponse.json({ error: 'name and baseUrl are required' }, { status: 400 });

    const normalizedUrl = baseUrl.replace(/\/$/, '');

    // Check if already exists
    const existing = await prisma.instanceRegistry.findUnique({ where: { baseUrl: normalizedUrl } });
    if (existing) {
      // Update existing
      const updated = await prisma.instanceRegistry.update({
        where: { id: existing.id },
        data: {
          name,
          isActive: true,
          platformLinked: true,
          marketplaceEnabled: true,
          discoveryEnabled: true,
          updatesEnabled: true,
          lastSeenAt: new Date(),
          lastSyncAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, instance: updated, action: 'updated' });
    }

    const instance = await prisma.instanceRegistry.create({
      data: {
        name,
        baseUrl: normalizedUrl,
        apiKey: apiKey || `admin-${Date.now()}`,
        isActive: true,
        isTrusted: true,
        platformLinked: true,
        marketplaceEnabled: true,
        discoveryEnabled: true,
        updatesEnabled: true,
        lastSeenAt: new Date(),
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, instance, action: 'created' }, { status: 201 });
  } catch (error) {
    console.error('Admin create instance error:', error);
    return NextResponse.json({ error: 'Failed to create instance' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id query parameter' }, { status: 400 });

    // Check instance exists
    const instance = await prisma.instanceRegistry.findUnique({ where: { id } });
    if (!instance) return NextResponse.json({ error: 'Instance not found' }, { status: 404 });

    // Clean up marketplace agents from this instance
    const deletedAgents = await prisma.marketplaceAgent.deleteMany({
      where: { sourceInstanceId: id },
    });

    // Delete the instance
    await prisma.instanceRegistry.delete({ where: { id } });

    console.log(`[Admin] Deleted instance ${id} (${instance.name}) — removed ${deletedAgents.count} marketplace agents`);

    return NextResponse.json({ success: true, deleted: { instance: instance.name, marketplaceAgents: deletedAgents.count } });
  } catch (error) {
    console.error('Admin delete instance error:', error);
    return NextResponse.json({ error: 'Failed to delete instance' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Only allow safe fields
    const allowed: Record<string, boolean> = {
      isActive: true, isTrusted: true, marketplaceEnabled: true,
      discoveryEnabled: true, updatesEnabled: true,
    };
    const safeUpdates: Record<string, any> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (allowed[k]) safeUpdates[k] = v;
    }

    const updated = await prisma.instanceRegistry.update({
      where: { id },
      data: safeUpdates,
    });

    // Cascade: when deactivating an instance, suspend its marketplace agents
    if ('isActive' in safeUpdates && safeUpdates.isActive === false) {
      const suspended = await prisma.marketplaceAgent.updateMany({
        where: { sourceInstanceId: id },
        data: { status: 'suspended' },
      });
      console.log(`[Admin] Deactivated instance ${id} — suspended ${suspended.count} marketplace agents`);
    }

    // Cascade: when disabling marketplace, also suspend agents
    if ('marketplaceEnabled' in safeUpdates && safeUpdates.marketplaceEnabled === false) {
      const suspended = await prisma.marketplaceAgent.updateMany({
        where: { sourceInstanceId: id },
        data: { status: 'suspended' },
      });
      console.log(`[Admin] Marketplace disabled for instance ${id} — suspended ${suspended.count} agents`);
    }

    // When re-activating, restore suspended agents from this instance
    if ('isActive' in safeUpdates && safeUpdates.isActive === true && updated.marketplaceEnabled) {
      const restored = await prisma.marketplaceAgent.updateMany({
        where: { sourceInstanceId: id, status: 'suspended' },
        data: { status: 'active' },
      });
      if (restored.count > 0) {
        console.log(`[Admin] Activated instance ${id} — restored ${restored.count} marketplace agents`);
      }
    }

    return NextResponse.json({ success: true, instance: updated });
  } catch (error) {
    console.error('Admin instance update error:', error);
    return NextResponse.json({ error: 'Failed to update instance' }, { status: 500 });
  }
}
