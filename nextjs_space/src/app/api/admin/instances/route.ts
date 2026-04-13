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

    return NextResponse.json({ success: true, instance: updated });
  } catch (error) {
    console.error('Admin instance update error:', error);
    return NextResponse.json({ error: 'Failed to update instance' }, { status: 500 });
  }
}
