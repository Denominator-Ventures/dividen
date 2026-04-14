export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializePricingConfig } from '@/lib/pricing-types';
import type { PricingConfig } from '@/lib/pricing-types';

/**
 * PUT /api/v2/federation/agents/[remoteId] — Register or update a single agent from a federated instance.
 * This is the preferred endpoint for managing individual agents (vs batch sync).
 *
 * Headers:
 *   Authorization: Bearer <platformToken>
 *
 * Body: Full agent config (same fields as the batch sync payload, without the wrapping array).
 *
 * GET /api/v2/federation/agents/[remoteId] — Get a single synced agent's details.
 *
 * DELETE /api/v2/federation/agents/[remoteId] — Remove a synced agent from the marketplace.
 */

async function verifyFederatedInstance(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  return prisma.instanceRegistry.findFirst({
    where: { platformToken: token, platformLinked: true, isActive: true },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { remoteId: string } }
) {
  try {
    const instance = await verifyFederatedInstance(req);
    if (!instance) {
      return NextResponse.json({ error: 'Invalid or inactive platform token' }, { status: 401 });
    }
    if (!instance.marketplaceEnabled) {
      return NextResponse.json(
        { error: 'Marketplace not enabled. Call /api/v2/federation/marketplace-link first.' },
        { status: 403 }
      );
    }

    const agent = await req.json();
    const remoteId = params.remoteId;

    if (!agent.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!adminUser) {
      return NextResponse.json({ error: 'No admin user on managed platform' }, { status: 500 });
    }

    const existing = await prisma.marketplaceAgent.findFirst({
      where: { sourceInstanceId: instance.id, remoteAgentId: remoteId },
    });

    const slug = existing?.slug || `${instance.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const endpointUrl = agent.endpointUrl || `${instance.baseUrl}/api/a2a`;

    let pricingDetails: string | null = null;
    if (agent.pricingConfig) {
      pricingDetails = typeof agent.pricingConfig === 'string'
        ? agent.pricingConfig
        : serializePricingConfig(agent.pricingConfig as PricingConfig);
    }

    const stringifyIfNeeded = (v: any): string | null => {
      if (!v) return null;
      return typeof v === 'string' ? v : JSON.stringify(v);
    };

    const data: any = {
      name: agent.name,
      slug,
      description: agent.description || `Agent from ${instance.name}`,
      longDescription: agent.longDescription || null,
      endpointUrl,
      authMethod: agent.authMethod || 'bearer',
      developerId: adminUser.id,
      developerName: agent.developerName || instance.name,
      developerUrl: agent.developerUrl || instance.baseUrl,
      category: agent.category || 'general',
      tags: stringifyIfNeeded(agent.tags),
      inputFormat: agent.inputFormat || 'text',
      outputFormat: agent.outputFormat || 'text',
      pricingModel: agent.pricingModel || 'free',
      pricePerTask: agent.pricePerTask ?? null,
      subscriptionPrice: agent.subscriptionPrice ?? null,
      taskLimit: agent.taskLimit ?? null,
      pricingDetails,
      status: agent.status || 'active',
      supportsA2A: agent.supportsA2A ?? true,
      supportsMCP: agent.supportsMCP ?? false,
      agentCardUrl: agent.agentCardUrl || null,
      version: agent.version || '1.0.0',
      sourceInstanceId: instance.id,
      remoteAgentId: remoteId,
      sourceInstanceUrl: instance.baseUrl,
      // Integration Kit
      taskTypes: stringifyIfNeeded(agent.taskTypes),
      contextInstructions: agent.contextInstructions || null,
      requiredInputSchema: stringifyIfNeeded(agent.requiredInputSchema),
      outputSchema: stringifyIfNeeded(agent.outputSchema),
      usageExamples: stringifyIfNeeded(agent.usageExamples),
      contextPreparation: stringifyIfNeeded(agent.contextPreparation),
      executionNotes: agent.executionNotes || null,
      // Display
      installGuide: agent.installGuide || null,
      commands: stringifyIfNeeded(agent.commands),
      samplePrompts: stringifyIfNeeded(agent.samplePrompts),
    };

    let result;
    if (existing) {
      result = await prisma.marketplaceAgent.update({ where: { id: existing.id }, data });
      return NextResponse.json({
        success: true,
        action: 'updated',
        marketplaceId: result.id,
        remoteId,
        slug: result.slug,
      });
    } else {
      result = await prisma.marketplaceAgent.create({ data });
      return NextResponse.json({
        success: true,
        action: 'created',
        marketplaceId: result.id,
        remoteId,
        slug: result.slug,
      }, { status: 201 });
    }
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Agent slug conflict. Try a different name.' }, { status: 409 });
    }
    console.error('PUT /api/v2/federation/agents/[remoteId] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { remoteId: string } }
) {
  try {
    const instance = await verifyFederatedInstance(req);
    if (!instance) {
      return NextResponse.json({ error: 'Invalid platform token' }, { status: 401 });
    }

    const agent = await prisma.marketplaceAgent.findFirst({
      where: { sourceInstanceId: instance.id, remoteAgentId: params.remoteId },
      select: {
        id: true, name: true, slug: true, description: true, longDescription: true,
        category: true, status: true, remoteAgentId: true,
        pricingModel: true, pricePerTask: true, subscriptionPrice: true,
        taskLimit: true, pricingDetails: true,
        totalExecutions: true, avgRating: true, totalRatings: true,
        totalGrossRevenue: true, totalDeveloperPayout: true, pendingPayout: true,
        supportsA2A: true, supportsMCP: true, version: true,
        installGuide: true, commands: true, samplePrompts: true,
        taskTypes: true, contextInstructions: true,
        createdAt: true, updatedAt: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found for this instance' }, { status: 404 });
    }

    return NextResponse.json({ success: true, agent });
  } catch (error: any) {
    console.error('GET /api/v2/federation/agents/[remoteId] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { remoteId: string } }
) {
  try {
    const instance = await verifyFederatedInstance(req);
    if (!instance) {
      return NextResponse.json({ error: 'Invalid platform token' }, { status: 401 });
    }

    const agent = await prisma.marketplaceAgent.findFirst({
      where: { sourceInstanceId: instance.id, remoteAgentId: params.remoteId },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found for this instance' }, { status: 404 });
    }

    // Remove subscriptions and executions first
    await prisma.marketplaceSubscription.deleteMany({ where: { agentId: agent.id } });
    await prisma.marketplaceExecution.deleteMany({ where: { agentId: agent.id } });
    await prisma.marketplaceAgent.delete({ where: { id: agent.id } });

    // Update instance agent count
    const agentCount = await prisma.marketplaceAgent.count({
      where: { sourceInstanceId: instance.id, status: 'active' },
    });
    await prisma.instanceRegistry.update({
      where: { id: instance.id },
      data: { agentCount, lastSyncAt: new Date() },
    });

    return NextResponse.json({ success: true, deleted: true, remoteId: params.remoteId });
  } catch (error: any) {
    console.error('DELETE /api/v2/federation/agents/[remoteId] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
