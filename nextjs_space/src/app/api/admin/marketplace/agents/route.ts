export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Admin Marketplace Agent Approval
 *
 * GET  /api/admin/marketplace/agents — List all agents with approval status filter
 * POST /api/admin/marketplace/agents — Approve, reject, or suspend a federated agent
 *   Body: { agentId: string, action: 'approve' | 'reject' | 'suspend', reason?: string }
 *
 * When an agent is approved/rejected, a webhook is fired to the source instance
 * so it knows the approval decision without polling.
 */

function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  return authHeader.slice(7) === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status'); // optional filter
  const sourceOnly = req.nextUrl.searchParams.get('federated') === 'true';

  const where: any = {};
  if (status) where.status = status;
  if (sourceOnly) where.sourceInstanceId = { not: null };

  const agents = await prisma.marketplaceAgent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, slug: true, description: true,
      category: true, status: true, pricingModel: true,
      developerName: true, developerUrl: true,
      sourceInstanceId: true, sourceInstanceUrl: true, remoteAgentId: true,
      version: true, totalExecutions: true, avgRating: true,
      supportsA2A: true, supportsMCP: true,
      createdAt: true, updatedAt: true,
    },
  });

  const counts = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    pending_review: agents.filter(a => a.status === 'pending_review').length,
    rejected: agents.filter(a => a.status === 'rejected').length,
    suspended: agents.filter(a => a.status === 'suspended' || a.status === 'disabled').length,
    federated: agents.filter(a => a.sourceInstanceId).length,
  };

  return NextResponse.json({ success: true, agents, counts });
}

export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { agentId, action, reason } = body;

    if (!agentId || !action) {
      return NextResponse.json({ error: 'agentId and action are required' }, { status: 400 });
    }

    const agent = await prisma.marketplaceAgent.findUnique({
      where: { id: agentId },
    });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    let newStatus: string;
    switch (action) {
      case 'approve':
        newStatus = 'active';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'suspend':
        newStatus = 'disabled';
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const { reviewNotes } = body;

    await prisma.marketplaceAgent.update({
      where: { id: agentId },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || reason || null,
      },
    });

    // Notify the developer about the decision (fire-and-forget)
    const decisionLabel = action === 'approve' ? '\u2705 Approved' : action === 'reject' ? '\u274C Rejected' : '\u26A0\uFE0F Suspended';
    prisma.activityLog.create({
      data: {
        userId: agent.developerId,
        action: 'marketplace_review_decision',
        summary: `${decisionLabel}: Your agent "${agent.name}" has been ${newStatus === 'active' ? 'approved and is now live' : newStatus === 'disabled' ? 'suspended' : newStatus}.${reason ? ` Reason: ${reason}` : ''}`,
        metadata: JSON.stringify({ agentId: agent.id, decision: action, newStatus, reason }),
      },
    }).catch(() => {});

    // Fire webhook to source instance if this is a federated agent
    let webhookResult: any = null;
    if (agent.sourceInstanceId) {
      webhookResult = await notifySourceInstance(agent, newStatus, reason);
    }

    return NextResponse.json({
      success: true,
      agentId: agent.id,
      name: agent.name,
      previousStatus: agent.status,
      newStatus,
      reason: reason || null,
      webhookSent: !!webhookResult?.sent,
      message: `Agent "${agent.name}" status changed: ${agent.status} \u2192 ${newStatus}`,
    });
  } catch (error: any) {
    console.error('POST /api/admin/marketplace/agents error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Notify the source instance about an agent approval decision.
 * Sends a webhook to the instance's base URL at /api/marketplace/webhook
 */
async function notifySourceInstance(
  agent: any,
  newStatus: string,
  reason?: string
): Promise<{ sent: boolean; error?: string }> {
  try {
    const instance = await prisma.instanceRegistry.findUnique({
      where: { id: agent.sourceInstanceId },
      select: { baseUrl: true, platformToken: true, apiKey: true },
    });
    if (!instance?.baseUrl) return { sent: false, error: 'Instance not found' };

    const webhookUrl = `${instance.baseUrl}/api/marketplace/webhook`;
    const payload = {
      event: 'agent_approval',
      agentId: agent.remoteAgentId || agent.id,
      marketplaceId: agent.id,
      name: agent.name,
      slug: agent.slug,
      status: newStatus,
      reason: reason || null,
      timestamp: new Date().toISOString(),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DiviDen-Event': 'agent_approval',
        'X-DiviDen-Source': 'marketplace',
        ...(instance.apiKey ? { 'X-Federation-Token': instance.apiKey } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[agent-approval-webhook] ${webhookUrl} returned ${response.status}`);
      return { sent: true, error: `HTTP ${response.status}` };
    }

    return { sent: true };
  } catch (err: any) {
    console.error('[agent-approval-webhook] Failed:', err.message);
    return { sent: false, error: err.message };
  }
}