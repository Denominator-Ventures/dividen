export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/v2/federation/marketplace-link — Enable marketplace participation for a federated instance.
 * Allows self-hosted instances to list agents on the managed marketplace.
 *
 * Headers:
 *   Authorization: Bearer <platformToken>
 *
 * Body:
 *   action: 'enable' | 'disable' | 'status'
 *
 * When enabled, agents from the self-hosted instance can be listed on the managed marketplace.
 * The instance must call the marketplace agent creation API with their platform token.
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate via platform token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Platform token required' }, { status: 401 });
    }

    const instance = await prisma.instanceRegistry.findFirst({
      where: { platformToken: token, platformLinked: true, isActive: true },
    });

    if (!instance) {
      return NextResponse.json(
        { error: 'Invalid platform token. Register your instance first via /api/v2/federation/register' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (!action || !['enable', 'disable', 'status'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "enable", "disable", or "status"' },
        { status: 400 }
      );
    }

    if (action === 'status') {
      return NextResponse.json({
        instanceId: instance.id,
        instanceName: instance.name,
        marketplaceEnabled: instance.marketplaceEnabled,
        discoveryEnabled: instance.discoveryEnabled,
        updatesEnabled: instance.updatesEnabled,
        agentCount: instance.agentCount,
        lastSyncAt: instance.lastSyncAt,
      });
    }

    const marketplaceEnabled = action === 'enable';

    await prisma.instanceRegistry.update({
      where: { id: instance.id },
      data: {
        marketplaceEnabled,
        discoveryEnabled: marketplaceEnabled ? true : instance.discoveryEnabled,
        updatesEnabled: true, // Always enable updates when linking
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      instanceId: instance.id,
      marketplaceEnabled,
      message: marketplaceEnabled
        ? 'Marketplace participation enabled. Your instance can now list agents on the managed marketplace. Use POST /api/v2/federation/marketplace-link/agents to list agents.'
        : 'Marketplace participation disabled. Your agents will no longer appear on the managed marketplace.',
      nextSteps: marketplaceEnabled ? [
        'POST agents to the managed marketplace via the agent listing API',
        'Set up Stripe Connect for payouts (optional, for paid agents)',
        'Agents from your instance will appear in the managed network discovery feed',
      ] : [],
    });
  } catch (error: any) {
    console.error('POST /api/v2/federation/marketplace-link error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
