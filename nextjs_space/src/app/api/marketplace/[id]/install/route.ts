export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/marketplace/[id]/install — Install an agent into Divi's toolkit
 * 
 * This does two things:
 * 1. Marks the subscription as installed
 * 2. Creates Memory entries from the agent's Integration Kit so Divi has persistent knowledge
 * 
 * If no subscription exists, creates one (free agents don't need payment).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // Fetch agent with full Integration Kit
    const agent = await prisma.marketplaceAgent.findUnique({
      where: { id: params.id },
    });
    if (!agent || agent.status !== 'active') {
      return NextResponse.json({ error: 'Agent not found or inactive' }, { status: 404 });
    }

    // For paid agents, require an existing active subscription before installing
    // Free agents can be installed directly (upsert creates subscription if needed)
    if (agent.pricingModel !== 'free') {
      const existingSub = await prisma.marketplaceSubscription.findUnique({
        where: { agentId_userId: { agentId: agent.id, userId } },
      });
      if (!existingSub || existingSub.status !== 'active') {
        return NextResponse.json(
          { error: `This is a ${agent.pricingModel} agent. Subscribe first, then install.` },
          { status: 402 }
        );
      }
      // Update existing subscription to installed
      await prisma.marketplaceSubscription.update({
        where: { id: existingSub.id },
        data: { installed: true, installedAt: new Date(), uninstalledAt: null },
      });
    } else {
      // Free agents — upsert subscription with installed flag
      await prisma.marketplaceSubscription.upsert({
        where: { agentId_userId: { agentId: agent.id, userId } },
        create: {
          agentId: agent.id,
          userId,
          status: 'active',
          installed: true,
          installedAt: new Date(),
        },
        update: {
          installed: true,
          installedAt: new Date(),
          uninstalledAt: null,
        },
      });
    }

    // Build memory entries from Integration Kit
    const memoryEntries: { key: string; value: string; category: string; tier: number }[] = [];
    const prefix = `agent:${agent.id}`;

    // Core identity
    memoryEntries.push({
      key: `${prefix}:identity`,
      value: JSON.stringify({
        name: agent.name,
        slug: agent.slug,
        category: agent.category,
        inputFormat: agent.inputFormat,
        outputFormat: agent.outputFormat,
        pricingModel: agent.pricingModel,
        developerName: agent.developerName,
        isOwnAgent: agent.developerId === userId,
      }),
      category: 'agent_toolkit',
      tier: 1,
    });

    // Task types — what this agent handles
    if (agent.taskTypes) {
      memoryEntries.push({
        key: `${prefix}:task_types`,
        value: agent.taskTypes,
        category: 'agent_toolkit',
        tier: 1,
      });
    }

    // Context instructions — how to prepare context
    if (agent.contextInstructions) {
      memoryEntries.push({
        key: `${prefix}:context_instructions`,
        value: agent.contextInstructions,
        category: 'agent_toolkit',
        tier: 2,
      });
    }

    // Preparation steps — pre-flight checklist
    if (agent.contextPreparation) {
      memoryEntries.push({
        key: `${prefix}:preparation_steps`,
        value: agent.contextPreparation,
        category: 'agent_toolkit',
        tier: 2,
      });
    }

    // Input/output schemas
    if (agent.requiredInputSchema) {
      memoryEntries.push({
        key: `${prefix}:input_schema`,
        value: agent.requiredInputSchema,
        category: 'agent_toolkit',
        tier: 1,
      });
    }
    if (agent.outputSchema) {
      memoryEntries.push({
        key: `${prefix}:output_schema`,
        value: agent.outputSchema,
        category: 'agent_toolkit',
        tier: 1,
      });
    }

    // Usage examples — learned patterns
    if (agent.usageExamples) {
      memoryEntries.push({
        key: `${prefix}:usage_examples`,
        value: agent.usageExamples,
        category: 'agent_toolkit',
        tier: 3,
      });
    }

    // Execution notes — behavioral rules
    if (agent.executionNotes) {
      memoryEntries.push({
        key: `${prefix}:execution_notes`,
        value: agent.executionNotes,
        category: 'agent_toolkit',
        tier: 2,
      });
    }

    // Upsert all memory entries (idempotent — safe to re-install)
    for (const entry of memoryEntries) {
      await prisma.memoryItem.upsert({
        where: { userId_key: { userId, key: entry.key } },
        create: {
          userId,
          key: entry.key,
          value: entry.value,
          category: entry.category,
          tier: entry.tier,
          source: 'system',
        },
        update: {
          value: entry.value,
          category: entry.category,
          tier: entry.tier,
        },
      });
    }

    return NextResponse.json({
      success: true,
      installed: true,
      agentId: agent.id,
      agentName: agent.name,
      memoryEntriesCreated: memoryEntries.length,
      message: `${agent.name} installed into Divi's toolkit. ${memoryEntries.length} knowledge entries loaded.`,
    });
  } catch (error: any) {
    console.error('Agent install error:', error);
    return NextResponse.json({ error: 'Failed to install agent' }, { status: 500 });
  }
}

/**
 * DELETE /api/marketplace/[id]/install — Uninstall an agent from Divi's toolkit
 * 
 * This does two things:
 * 1. Marks the subscription as uninstalled
 * 2. Removes all Memory entries for this agent — Divi forgets how to work with it
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // Update subscription
    const sub = await prisma.marketplaceSubscription.findUnique({
      where: { agentId_userId: { agentId: params.id, userId } },
    });

    if (sub) {
      await prisma.marketplaceSubscription.update({
        where: { id: sub.id },
        data: {
          installed: false,
          uninstalledAt: new Date(),
        },
      });
    }

    // Delete all memory entries for this agent — Divi forgets
    const prefix = `agent:${params.id}`;
    const deleted = await prisma.memoryItem.deleteMany({
      where: {
        userId,
        key: { startsWith: prefix },
      },
    });

    return NextResponse.json({
      success: true,
      installed: false,
      agentId: params.id,
      memoryEntriesRemoved: deleted.count,
      message: `Agent uninstalled. ${deleted.count} knowledge entries removed from Divi's memory.`,
    });
  } catch (error: any) {
    console.error('Agent uninstall error:', error);
    return NextResponse.json({ error: 'Failed to uninstall agent' }, { status: 500 });
  }
}
