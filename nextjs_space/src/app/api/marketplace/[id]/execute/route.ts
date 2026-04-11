export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateRevenueSplit } from '@/lib/marketplace-config';

const EXECUTION_TIMEOUT = 30000; // 30s

// POST /api/marketplace/[id]/execute — Execute a task against an agent
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
    const body = await req.json();
    const { input } = body;

    if (!input || typeof input !== 'string' || !input.trim()) {
      return NextResponse.json({ error: 'input is required' }, { status: 400 });
    }

    const agent = await prisma.marketplaceAgent.findUnique({ where: { id: params.id } });
    if (!agent || agent.status !== 'active') {
      return NextResponse.json({ error: 'Agent not found or not active' }, { status: 404 });
    }

    // Check subscription / rate limits for paid agents
    if (agent.pricingModel === 'subscription') {
      const sub = await prisma.marketplaceSubscription.findUnique({
        where: { agentId_userId: { agentId: agent.id, userId } },
      });
      if (!sub || sub.status !== 'active') {
        return NextResponse.json(
          { error: 'Active subscription required. Subscribe to this agent first.' },
          { status: 402 }
        );
      }
      if (sub.taskLimit && sub.tasksUsed >= sub.taskLimit) {
        return NextResponse.json(
          { error: 'Task limit reached for current billing period.' },
          { status: 429 }
        );
      }
    }

    // Create execution record
    const execution = await prisma.marketplaceExecution.create({
      data: {
        agentId: agent.id,
        userId,
        taskInput: input.trim(),
        status: 'running',
      },
    });

    const startTime = Date.now();

    try {
      // Build request to agent endpoint
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-DiviDen-Execution-Id': execution.id,
        'X-DiviDen-Source': 'marketplace',
      };

      if (agent.authMethod === 'bearer' && agent.authToken) {
        headers['Authorization'] = `Bearer ${agent.authToken}`;
      } else if (agent.authMethod === 'api_key' && agent.authToken) {
        headers['X-API-Key'] = agent.authToken;
      } else if (agent.authMethod === 'header' && agent.authHeader && agent.authToken) {
        headers[agent.authHeader] = agent.authToken;
      }

      // Build payload based on input format
      let payload: any;
      if (agent.inputFormat === 'a2a') {
        payload = {
          jsonrpc: '2.0',
          method: 'tasks/send',
          params: {
            id: execution.id,
            message: {
              role: 'user',
              parts: [{ type: 'text', text: input.trim() }],
            },
          },
        };
      } else if (agent.inputFormat === 'json') {
        payload = { task: input.trim(), executionId: execution.id };
      } else {
        payload = { message: input.trim() };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT);

      const response = await fetch(agent.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const responseTimeMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        await prisma.marketplaceExecution.update({
          where: { id: execution.id },
          data: {
            status: 'failed',
            errorMessage: `Agent returned ${response.status}: ${errorText.slice(0, 1000)}`,
            completedAt: new Date(),
            responseTimeMs,
          },
        });

        return NextResponse.json({
          executionId: execution.id,
          status: 'failed',
          error: `Agent returned ${response.status}`,
          responseTimeMs,
        });
      }

      // Parse response
      let output: string;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        // Handle A2A response format
        if (json.result?.status?.message?.parts) {
          output = json.result.status.message.parts
            .map((p: any) => p.text || JSON.stringify(p))
            .join('\n');
        } else if (json.message || json.output || json.result || json.text || json.response) {
          output = json.message || json.output || json.text || json.response || JSON.stringify(json.result);
        } else {
          output = JSON.stringify(json, null, 2);
        }
      } else {
        output = await response.text();
      }

      // Calculate revenue split for paid agents
      let grossAmount = 0;
      if (agent.pricingModel === 'per_task' && agent.pricePerTask) {
        grossAmount = agent.pricePerTask;
      }
      // Subscription revenue is tracked at subscription level, not per-execution
      const revSplit = calculateRevenueSplit(grossAmount);

      // Update execution
      await prisma.marketplaceExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          taskOutput: output,
          completedAt: new Date(),
          responseTimeMs,
          grossAmount: revSplit.grossAmount,
          platformFee: revSplit.platformFee,
          developerPayout: revSplit.developerPayout,
          feePercent: revSplit.feePercent,
        },
      });

      // Update agent stats + revenue accumulators
      const execCount = agent.totalExecutions + 1;
      const newAvgResponse = agent.avgResponseTime
        ? (agent.avgResponseTime * agent.totalExecutions + responseTimeMs) / execCount
        : responseTimeMs;
      const successCount = (agent.successRate ?? 1) * agent.totalExecutions + 1;

      await prisma.marketplaceAgent.update({
        where: { id: agent.id },
        data: {
          totalExecutions: execCount,
          avgResponseTime: Math.round(newAvgResponse),
          successRate: successCount / execCount,
          totalGrossRevenue: { increment: revSplit.grossAmount },
          totalPlatformFees: { increment: revSplit.platformFee },
          totalDeveloperPayout: { increment: revSplit.developerPayout },
          pendingPayout: { increment: revSplit.developerPayout },
        },
      });

      // Increment subscription usage if applicable
      if (agent.pricingModel === 'subscription') {
        await prisma.marketplaceSubscription.updateMany({
          where: { agentId: agent.id, userId, status: 'active' },
          data: { tasksUsed: { increment: 1 } },
        });
      }

      return NextResponse.json({
        executionId: execution.id,
        status: 'completed',
        output,
        responseTimeMs,
        revenue: revSplit.grossAmount > 0 ? {
          gross: revSplit.grossAmount,
          developerPayout: revSplit.developerPayout,
          platformFee: revSplit.platformFee,
          feePercent: revSplit.feePercent,
        } : undefined,
      });
    } catch (execError: any) {
      const responseTimeMs = Date.now() - startTime;
      const isTimeout = execError.name === 'AbortError';

      await prisma.marketplaceExecution.update({
        where: { id: execution.id },
        data: {
          status: isTimeout ? 'timeout' : 'failed',
          errorMessage: isTimeout ? 'Request timed out after 30s' : execError.message?.slice(0, 1000),
          completedAt: new Date(),
          responseTimeMs,
        },
      });

      // Update agent failure stats
      const execCount = agent.totalExecutions + 1;
      const successCount = (agent.successRate ?? 1) * agent.totalExecutions;
      await prisma.marketplaceAgent.update({
        where: { id: agent.id },
        data: {
          totalExecutions: execCount,
          successRate: successCount / execCount,
        },
      });

      return NextResponse.json({
        executionId: execution.id,
        status: isTimeout ? 'timeout' : 'failed',
        error: isTimeout ? 'Agent did not respond within 30 seconds' : 'Execution failed',
        responseTimeMs,
      });
    }
  } catch (error: any) {
    console.error('Marketplace execution error:', error);
    return NextResponse.json({ error: 'Failed to execute task' }, { status: 500 });
  }
}
