export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/v2/federation/agents — Sync agents from a federated instance to the managed marketplace.
 * Self-hosted instances call this to push their agents so they appear on dividen.ai.
 *
 * Headers:
 *   Authorization: Bearer <platformToken>
 *
 * Body:
 *   agents: Array of { id, name, description, category?, tags?, pricingModel?, pricePerTask?, endpointUrl, developerName, inputFormat?, outputFormat? }
 *
 * GET /api/v2/federation/agents — List agents synced from this instance.
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
    if (!instance.marketplaceEnabled) {
      return NextResponse.json(
        { error: 'Marketplace not enabled for this instance. Call /api/v2/federation/marketplace-link first.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { agents } = body;
    if (!Array.isArray(agents) || agents.length === 0) {
      return NextResponse.json({ error: 'agents array is required' }, { status: 400 });
    }

    // We need a "system" user to own federated agents — use the first admin user
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!adminUser) {
      return NextResponse.json({ error: 'No admin user on managed platform' }, { status: 500 });
    }

    const results: any[] = [];

    for (const agent of agents.slice(0, 50)) {
      if (!agent.name || !agent.id) {
        results.push({ remoteId: agent.id, status: 'skipped', reason: 'Missing name or id' });
        continue;
      }

      try {
        // Check if this agent already exists from this instance
        const existing = await prisma.marketplaceAgent.findFirst({
          where: { sourceInstanceId: instance.id, remoteAgentId: agent.id },
        });

        const slug = `${instance.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const endpointUrl = agent.endpointUrl || `${instance.baseUrl}/api/a2a`;

        const data = {
          name: agent.name,
          slug,
          description: agent.description || `Agent from ${instance.name}`,
          longDescription: agent.longDescription || null,
          endpointUrl,
          authMethod: 'bearer' as const,
          developerId: adminUser.id,
          developerName: agent.developerName || instance.name,
          developerUrl: instance.baseUrl,
          category: agent.category || 'general',
          tags: agent.tags ? (typeof agent.tags === 'string' ? agent.tags : JSON.stringify(agent.tags)) : null,
          inputFormat: agent.inputFormat || 'text',
          outputFormat: agent.outputFormat || 'text',
          pricingModel: agent.pricingModel || 'free',
          pricePerTask: agent.pricePerTask || null,
          subscriptionPrice: agent.subscriptionPrice || null,
          status: 'active',
          supportsA2A: true,
          sourceInstanceId: instance.id,
          remoteAgentId: agent.id,
          sourceInstanceUrl: instance.baseUrl,
          samplePrompts: agent.samplePrompts ? (typeof agent.samplePrompts === 'string' ? agent.samplePrompts : JSON.stringify(agent.samplePrompts)) : null,
          taskTypes: agent.taskTypes ? (typeof agent.taskTypes === 'string' ? agent.taskTypes : JSON.stringify(agent.taskTypes)) : null,
        };

        if (existing) {
          await prisma.marketplaceAgent.update({
            where: { id: existing.id },
            data,
          });
          results.push({ remoteId: agent.id, name: agent.name, status: 'updated', marketplaceId: existing.id });
        } else {
          const created = await prisma.marketplaceAgent.create({ data });
          results.push({ remoteId: agent.id, name: agent.name, status: 'created', marketplaceId: created.id });
        }
      } catch (err: any) {
        // Handle unique slug conflicts by appending instance id
        if (err.code === 'P2002' && err.meta?.target?.includes('slug')) {
          try {
            const fallbackSlug = `${instance.id.slice(0, 8)}-${agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            const created = await prisma.marketplaceAgent.create({
              data: {
                name: agent.name,
                slug: fallbackSlug,
                description: agent.description || `Agent from ${instance.name}`,
                endpointUrl: agent.endpointUrl || `${instance.baseUrl}/api/a2a`,
                authMethod: 'bearer',
                developerId: adminUser.id,
                developerName: agent.developerName || instance.name,
                developerUrl: instance.baseUrl,
                category: agent.category || 'general',
                inputFormat: agent.inputFormat || 'text',
                outputFormat: agent.outputFormat || 'text',
                pricingModel: agent.pricingModel || 'free',
                status: 'active',
                supportsA2A: true,
                sourceInstanceId: instance.id,
                remoteAgentId: agent.id,
                sourceInstanceUrl: instance.baseUrl,
              },
            });
            results.push({ remoteId: agent.id, name: agent.name, status: 'created', marketplaceId: created.id });
          } catch (err2: any) {
            results.push({ remoteId: agent.id, status: 'error', reason: err2.message });
          }
        } else {
          results.push({ remoteId: agent.id, status: 'error', reason: err.message });
        }
      }
    }

    // Update agent count on instance
    const agentCount = await prisma.marketplaceAgent.count({
      where: { sourceInstanceId: instance.id, status: 'active' },
    });
    await prisma.instanceRegistry.update({
      where: { id: instance.id },
      data: { agentCount, lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      instanceId: instance.id,
      synced: results.filter(r => r.status === 'created' || r.status === 'updated').length,
      total: results.length,
      results,
    });
  } catch (error: any) {
    console.error('POST /api/v2/federation/agents error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Platform token required' }, { status: 401 });
    }

    const instance = await prisma.instanceRegistry.findFirst({
      where: { platformToken: token, platformLinked: true },
    });
    if (!instance) {
      return NextResponse.json({ error: 'Invalid platform token' }, { status: 401 });
    }

    const agents = await prisma.marketplaceAgent.findMany({
      where: { sourceInstanceId: instance.id },
      select: {
        id: true, name: true, slug: true, description: true,
        category: true, status: true, remoteAgentId: true,
        totalExecutions: true, avgRating: true,
        createdAt: true, updatedAt: true,
      },
    });

    return NextResponse.json({
      instanceId: instance.id,
      agents,
      total: agents.length,
    });
  } catch (error: any) {
    console.error('GET /api/v2/federation/agents error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
