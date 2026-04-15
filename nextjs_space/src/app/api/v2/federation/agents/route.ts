export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializePricingConfig } from '@/lib/pricing-types';
import type { PricingConfig } from '@/lib/pricing-types';

/**
 * POST /api/v2/federation/agents — Sync agents from a federated instance to the managed marketplace.
 * Self-hosted instances call this to push their agents so they appear on dividen.ai.
 *
 * Headers:
 *   Authorization: Bearer <platformToken>
 *
 * Body:
 *   agents: Array of AgentSyncPayload (see below)
 *
 * AgentSyncPayload:
 *   id            — required, remote agent ID
 *   name          — required
 *   description   — required
 *   endpointUrl   — agent's A2A/MCP endpoint
 *   developerName — display name for attribution
 *   developerUrl  — developer website / github (optional)
 *   category      — "research" | "coding" | "writing" | "analysis" | "operations" | "creative" | "general"
 *   tags          — comma-separated or JSON array
 *   inputFormat   — "text" | "json" | "a2a"
 *   outputFormat  — "text" | "json" | "a2a"
 *   longDescription — rich markdown
 *
 *   === Pricing ===
 *   pricingModel  — "free" | "per_task" | "per_execution" (alias) | "tiered" | "dynamic"
 *   pricePerTask | pricingAmount — $ per execution (for per_task model)
 *   currency      — ISO 4217 currency code (default "USD")
 *   subscriptionPrice — $ per month (for subscription model)
 *   taskLimit     — monthly task limit
 *   pricingConfig — full PricingConfig object (tiers, dynamic config, etc.)
 *
 *   === Agent Integration Kit (flat or nested under `capabilities`) ===
 *   taskTypes | capabilities.taskTypes
 *   contextInstructions | capabilities.contextInstructions
 *   capabilities.identity — additional identity metadata
 *   requiredInputSchema — JSON schema for structured input
 *   outputSchema       — JSON schema for structured output
 *   usageExamples      — [{input, output, description}]
 *   contextPreparation — preparation steps
 *   executionNotes     — quirks, rate limits, best practices
 *
 *   === Display ===
 *   installGuide  — Markdown post-install instructions
 *   commands      — [{name, description, usage}] for !command syntax
 *   samplePrompts — example prompts
 *   version       — semver
 *   supportsA2A   — boolean
 *   supportsMCP   — boolean
 *   agentCardUrl  — .well-known/agent-card.json URL
 *
 * Approval: ALL agents go to pending_review regardless of instance trust level.
 *
 * GET /api/v2/federation/agents — List agents synced from this instance.
 */

/** Normalize pricing model aliases: per_execution → per_task */
function normalizePricingModel(model: string | undefined): string {
  if (!model) return 'free';
  if (model === 'per_execution') return 'per_task';
  return model;
}

async function verifyFederatedInstance(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  return prisma.instanceRegistry.findFirst({
    where: { platformToken: token, platformLinked: true, isActive: true },
  });
}

export async function POST(req: NextRequest) {
  try {
    const instance = await verifyFederatedInstance(req);
    if (!instance) {
      return NextResponse.json({ error: 'Invalid or inactive platform token' }, { status: 401 });
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

    // System user to own federated agents
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
        const existing = await prisma.marketplaceAgent.findFirst({
          where: { sourceInstanceId: instance.id, remoteAgentId: agent.id },
        });

        const slug = `${instance.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const endpointUrl = agent.endpointUrl || `${instance.baseUrl}/api/a2a`;

        // Build pricingDetails from pricingConfig if provided
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

        // Accept pricing amount from either field name (pricingAmount is the FVP spec name)
        const resolvedPricePerTask = agent.pricePerTask ?? agent.pricingAmount ?? null;

        // Accept capabilities nested OR flat — FVP spec nests under `capabilities` object
        const caps = agent.capabilities || {};
        const resolvedTaskTypes = agent.taskTypes || caps.taskTypes || null;
        const resolvedContextInstructions = agent.contextInstructions || caps.contextInstructions || null;

        const data: any = {
          name: agent.name,
          slug,
          description: agent.description || `Agent from ${instance.name}`,
          longDescription: agent.longDescription || null,
          endpointUrl,
          authMethod: 'bearer' as const,
          developerId: adminUser.id,
          developerName: agent.developerName || instance.name,
          // Use submitted developerUrl/developerWebsite, fall back to instance base URL
          developerUrl: agent.developerUrl || agent.developerWebsite || instance.baseUrl,
          category: agent.category || 'general',
          tags: stringifyIfNeeded(agent.tags),
          inputFormat: agent.inputFormat || 'text',
          outputFormat: agent.outputFormat || 'text',
          // Normalize per_execution → per_task
          pricingModel: normalizePricingModel(agent.pricingModel),
          pricePerTask: resolvedPricePerTask,
          subscriptionPrice: agent.subscriptionPrice ?? null,
          taskLimit: agent.taskLimit ?? null,
          pricingDetails,
          currency: agent.currency || 'USD',
          // ALL agents go to pending_review — never auto-approve, even for trusted instances
          status: 'pending_review',
          supportsA2A: agent.supportsA2A ?? true,
          supportsMCP: agent.supportsMCP ?? false,
          agentCardUrl: agent.agentCardUrl || null,
          version: agent.version || '1.0.0',
          sourceInstanceId: instance.id,
          remoteAgentId: agent.id,
          sourceInstanceUrl: instance.baseUrl,
          // Agent Integration Kit — accept flat or nested under capabilities
          taskTypes: stringifyIfNeeded(resolvedTaskTypes),
          contextInstructions: resolvedContextInstructions || null,
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

        if (existing) {
          // Preserve existing approval status on updates — don't downgrade active agents
          const { status: _omitStatus, ...updateData } = data;
          await prisma.marketplaceAgent.update({ where: { id: existing.id }, data: updateData });
          results.push({ remoteId: agent.id, name: agent.name, status: 'updated', marketplaceId: existing.id, approvalStatus: existing.status });
        } else {
          const created = await prisma.marketplaceAgent.create({ data });
          results.push({ remoteId: agent.id, name: agent.name, status: 'created', marketplaceId: created.id, approvalStatus: data.status });
        }
      } catch (err: any) {
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
                developerUrl: agent.developerUrl || agent.developerWebsite || instance.baseUrl,
                category: agent.category || 'general',
                pricingModel: normalizePricingModel(agent.pricingModel),
                pricePerTask: agent.pricePerTask ?? agent.pricingAmount ?? null,
                currency: agent.currency || 'USD',
                status: 'pending_review',
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

    // Update instance stats
    const agentCount = await prisma.marketplaceAgent.count({
      where: { sourceInstanceId: instance.id, status: 'active' },
    });
    await prisma.instanceRegistry.update({
      where: { id: instance.id },
      data: { agentCount, lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      status: 'pending_review',  // top-level: all submissions enter review
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
    const instance = await verifyFederatedInstance(req);
    if (!instance) {
      return NextResponse.json({ error: 'Invalid platform token' }, { status: 401 });
    }

    const agents = await prisma.marketplaceAgent.findMany({
      where: { sourceInstanceId: instance.id },
      select: {
        id: true, name: true, slug: true, description: true,
        category: true, status: true, remoteAgentId: true,
        pricingModel: true, pricePerTask: true, pricingDetails: true,
        totalExecutions: true, avgRating: true, totalRatings: true,
        totalGrossRevenue: true, totalDeveloperPayout: true,
        supportsA2A: true, supportsMCP: true, version: true,
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
