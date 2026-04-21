export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { withTelemetry } from '@/lib/telemetry';

/**
 * DEP-006: Connection Ceremony & Trust Negotiation
 *
 * POST /api/main-connect
 * Formal connection ceremony when an external execution agent connects.
 *
 * Steps:
 * 1. Deactivate previous agent connections
 * 2. Generate fresh API key
 * 3. Register instance
 * 4. Create/update connection
 * 5. Log to comms + activity
 * 6. Return credentials + endpoints
 */
async function _POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { instanceUrl, instanceName, protocol = 'both' } = body || {};

  try {
    // 1. Deactivate previous agent connections (InstanceRegistry)
    await prisma.instanceRegistry.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Cancel in-flight relays for agent connections
    await prisma.agentRelay.updateMany({
      where: {
        fromUserId: userId,
        status: { in: ['pending', 'delivered', 'agent_handling'] },
        intent: 'assign_task',
      },
      data: { status: 'declined', resolvedAt: new Date() },
    });

    // Deactivate old agent API keys
    await prisma.externalApiKey.updateMany({
      where: { userId, name: { startsWith: 'main_agent_' } },
      data: { isActive: false },
    });

    // 2. Generate fresh API key
    const newApiKey = `main_${crypto.randomBytes(24).toString('hex')}`;

    const apiKeyRecord = await prisma.externalApiKey.create({
      data: {
        name: `main_agent_${Date.now()}`,
        key: newApiKey,
        keyPrefix: newApiKey.substring(0, 8),
        permissions: 'all',
        isActive: true,
        user: { connect: { id: userId } },
      },
    });

    // 3. Register instance
    let instanceRecord;
    if (instanceUrl) {
      instanceRecord = await prisma.instanceRegistry.upsert({
        where: { baseUrl: instanceUrl },
        update: {
          name: instanceName || 'Execution Agent',
          apiKey: newApiKey,
          isActive: true,
          lastSeenAt: new Date(),
          metadata: JSON.stringify({ protocol, connectedAt: new Date().toISOString() }),
        },
        create: {
          name: instanceName || 'Execution Agent',
          baseUrl: instanceUrl,
          apiKey: newApiKey,
          isActive: true,
          lastSeenAt: new Date(),
          metadata: JSON.stringify({ protocol, connectedAt: new Date().toISOString() }),
        },
      });
    } else {
      // Local agent — create a localhost entry
      instanceRecord = await prisma.instanceRegistry.create({
        data: {
          name: instanceName || 'Local Execution Agent',
          baseUrl: `local://${userId}/${Date.now()}`,
          apiKey: newApiKey,
          isActive: true,
          lastSeenAt: new Date(),
          metadata: JSON.stringify({ protocol, local: true }),
        },
      });
    }

    // 4. Create self-connection for agent routing
    const existingConnection = await prisma.connection.findFirst({
      where: {
        requesterId: userId,
        accepterId: userId,
      },
    });

    let connectionRecord;
    if (existingConnection) {
      connectionRecord = await prisma.connection.update({
        where: { id: existingConnection.id },
        data: {
          status: 'active',
          permissions: JSON.stringify({ trustLevel: 'full_auto', scopes: ['all'] }),
          isFederated: !!instanceUrl,
          peerInstanceUrl: instanceUrl || null,
        },
      });
    } else {
      connectionRecord = await prisma.connection.create({
        data: {
          requesterId: userId,
          accepterId: userId,
          status: 'active',
          permissions: JSON.stringify({ trustLevel: 'full_auto', scopes: ['all'] }),
          isFederated: !!instanceUrl,
          peerInstanceUrl: instanceUrl || null,
        },
      });
    }

    // 5. Log to comms
    await prisma.commsMessage.create({
      data: {
        sender: 'system',
        content: `🔌 [SYSTEM] Agent connected: ${instanceName || 'Execution Agent'}`,
        state: 'new',
        priority: 'normal',
        userId,
        metadata: JSON.stringify({
          type: 'connection_ceremony',
          instanceId: instanceRecord.id,
          connectionId: connectionRecord.id,
        }),
      },
    });

    // 6. Return credentials + endpoints
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${proto}://${host}`;

    return NextResponse.json({
      status: 'connected',
      apiKey: newApiKey,
      connectionId: connectionRecord.id,
      instanceId: instanceRecord.id,
      trustLevel: 'full_auto',
      endpoints: {
        a2a: `${baseUrl}/api/a2a`,
        sse: `${baseUrl}/api/a2a?stream=true`,
        playbook: `${baseUrl}/api/a2a/playbook`,
        handoff: `${baseUrl}/api/main-handoff`,
      },
      protocol,
    });
  } catch (error: any) {
    console.error('POST /api/main-connect error:', error);
    return NextResponse.json({ error: error.message || 'Connection ceremony failed' }, { status: 500 });
  }
}

export const POST = withTelemetry(_POST);
