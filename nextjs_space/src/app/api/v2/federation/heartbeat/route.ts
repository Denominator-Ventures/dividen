export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/v2/federation/heartbeat — Periodic heartbeat from federated instances.
 * Updates instance status, user/agent counts, and last-seen timestamps.
 *
 * Headers:
 *   Authorization: Bearer <platformToken>
 *
 * Body (all optional):
 *   version    — Current instance version
 *   userCount  — Current user count
 *   agentCount — Current agent count
 *   status     — 'healthy' | 'degraded' | 'maintenance'
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Platform token required' }, { status: 401 });
    }

    const instance = await prisma.instanceRegistry.findFirst({
      where: { platformToken: token, platformLinked: true, isActive: true },
    });

    if (!instance) {
      return NextResponse.json({ error: 'Invalid platform token' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const data: any = {
      lastSeenAt: new Date(),
      lastSyncAt: new Date(),
    };
    if (body.version) data.version = body.version;
    if (body.userCount !== undefined) data.userCount = body.userCount;
    if (body.agentCount !== undefined) data.agentCount = body.agentCount;
    if (body.status) {
      data.metadata = JSON.stringify({
        ...JSON.parse(instance.metadata || '{}'),
        status: body.status,
        lastHeartbeat: new Date().toISOString(),
      });
    }

    await prisma.instanceRegistry.update({
      where: { id: instance.id },
      data,
    });

    // Return current network stats so the instance can display them
    const [networkUsers, networkAgents, networkInstances] = await Promise.all([
      prisma.user.count(),
      prisma.marketplaceAgent.count({ where: { status: 'active' } }),
      prisma.instanceRegistry.count({ where: { isActive: true, platformLinked: true } }),
    ]);

    return NextResponse.json({
      success: true,
      instanceId: instance.id,
      networkStats: {
        totalUsers: networkUsers,
        totalAgents: networkAgents,
        federatedInstances: networkInstances,
      },
      features: {
        marketplace: instance.marketplaceEnabled,
        discovery: instance.discoveryEnabled,
        updates: instance.updatesEnabled,
      },
    });
  } catch (error: any) {
    console.error('POST /api/v2/federation/heartbeat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
