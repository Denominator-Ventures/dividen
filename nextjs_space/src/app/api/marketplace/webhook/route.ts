export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/marketplace/webhook — Receive webhooks from the managed marketplace.
 *
 * Events:
 *   agent_approval      — Fired when a federated agent is approved/rejected/suspended on the managed marketplace.
 *   capability_approval — Fired when a federated capability's approval status changes on the managed marketplace.
 *   instance_status     — Fired when an instance is activated/deactivated by the platform admin.
 *
 * Auth:
 *   X-Federation-Token header must match a registered instance's apiKey.
 *   Falls back to checking the FEDERATION_API_KEY env var for self-hosted instances.
 *
 * Payload (agent_approval):
 *   {
 *     event: 'agent_approval',
 *     agentId: string,         // remoteAgentId (our local agent ID)
 *     marketplaceId: string,   // ID on the managed marketplace
 *     name: string,
 *     slug: string,
 *     status: 'active' | 'rejected' | 'disabled',
 *     reason: string | null,
 *     timestamp: string         // ISO 8601
 *   }
 *
 * Response:
 *   { received: true, event, agentId, previousStatus, newStatus }
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth: validate federation token ──
    const federationToken = req.headers.get('x-federation-token');
    const dividenEvent = req.headers.get('x-dividen-event');

    if (!federationToken) {
      return NextResponse.json({ error: 'X-Federation-Token header required' }, { status: 401 });
    }

    // Check against registered instances
    const instance = await prisma.instanceRegistry.findFirst({
      where: { apiKey: federationToken, isActive: true },
      select: { id: true, name: true, baseUrl: true },
    });

    // Fallback: check against local FEDERATION_API_KEY env var
    const localKey = process.env.FEDERATION_API_KEY;
    const isLocalAuth = !instance && localKey && federationToken === localKey;

    if (!instance && !isLocalAuth) {
      return NextResponse.json({ error: 'Invalid federation token' }, { status: 401 });
    }

    const body = await req.json();
    const { event } = body;

    if (!event) {
      return NextResponse.json({ error: 'event field is required' }, { status: 400 });
    }

    // ── Route by event type ──
    switch (event) {
      case 'agent_approval':
        return handleAgentApproval(body, instance);

      case 'capability_approval':
        return handleCapabilityApproval(body, instance);

      case 'instance_status':
        return handleInstanceStatus(body, instance);

      default:
        console.log(`[marketplace-webhook] Unknown event: ${event}`);
        return NextResponse.json({
          received: true,
          event,
          message: `Event type '${event}' acknowledged but not handled.`,
        });
    }
  } catch (error: any) {
    console.error('[marketplace-webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleAgentApproval(
  body: any,
  sourceInstance: { id: string; name: string; baseUrl: string } | null
) {
  const { agentId, marketplaceId, name, slug, status, reason, timestamp } = body;

  if (!agentId || !status) {
    return NextResponse.json(
      { error: 'agentId and status are required for agent_approval events' },
      { status: 400 }
    );
  }

  // Map marketplace status to our local status
  const statusMap: Record<string, string> = {
    active: 'active',
    rejected: 'rejected',
    disabled: 'disabled',
    suspended: 'disabled',
  };
  const newLocalStatus = statusMap[status] || status;

  // Find the local agent — try by ID first, then by slug
  let agent = await prisma.marketplaceAgent.findUnique({
    where: { id: agentId },
    select: { id: true, name: true, status: true, slug: true },
  });

  if (!agent && slug) {
    agent = await prisma.marketplaceAgent.findUnique({
      where: { slug },
      select: { id: true, name: true, status: true, slug: true },
    });
  }

  if (!agent) {
    console.warn(`[marketplace-webhook] agent_approval for unknown agent: ${agentId} / ${slug}`);
    return NextResponse.json({
      received: true,
      event: 'agent_approval',
      warning: `Agent not found locally (id=${agentId}, slug=${slug}). Webhook acknowledged but no action taken.`,
    });
  }

  const previousStatus = agent.status;

  // Update local agent status
  await prisma.marketplaceAgent.update({
    where: { id: agent.id },
    data: {
      status: newLocalStatus,
      // Store the managed marketplace ID for future reference
      ...(marketplaceId ? { remoteAgentId: marketplaceId } : {}),
    },
  });

  console.log(
    `[marketplace-webhook] agent_approval: "${agent.name}" (${agent.id}) ${previousStatus} → ${newLocalStatus}` +
    (reason ? ` (reason: ${reason})` : '') +
    (sourceInstance ? ` from ${sourceInstance.name}` : '')
  );

  return NextResponse.json({
    received: true,
    event: 'agent_approval',
    agentId: agent.id,
    name: agent.name,
    previousStatus,
    newStatus: newLocalStatus,
    reason: reason || null,
    processedAt: new Date().toISOString(),
  });
}

/**
 * Handle capability_approval events.
 * Updates local capability approvalStatus when the managed marketplace reviews it.
 */
async function handleCapabilityApproval(
  body: any,
  sourceInstance: { id: string; name: string; baseUrl: string } | null
) {
  const { capabilityId, name, slug, status, reason } = body;

  if (!capabilityId || !status) {
    return NextResponse.json(
      { error: 'capabilityId and status are required for capability_approval events' },
      { status: 400 }
    );
  }

  // Find the local capability — try by ID first, then by slug
  let capability = await prisma.marketplaceCapability.findUnique({
    where: { id: capabilityId },
    select: { id: true, name: true, approvalStatus: true, slug: true, createdByUserId: true },
  });

  if (!capability && slug) {
    capability = await prisma.marketplaceCapability.findUnique({
      where: { slug },
      select: { id: true, name: true, approvalStatus: true, slug: true, createdByUserId: true },
    });
  }

  if (!capability) {
    console.warn(`[marketplace-webhook] capability_approval for unknown capability: ${capabilityId} / ${slug}`);
    return NextResponse.json({
      received: true,
      event: 'capability_approval',
      warning: `Capability not found locally (id=${capabilityId}, slug=${slug}). Acknowledged but no action taken.`,
    });
  }

  const previousStatus = capability.approvalStatus;

  await prisma.marketplaceCapability.update({
    where: { id: capability.id },
    data: {
      approvalStatus: status,
      ...(reason ? { rejectionReason: reason } : {}),
      reviewedAt: new Date(),
    },
  });

  // Log activity for the capability author
  if (capability.createdByUserId) {
    const label = status === 'approved' ? '✅ Approved' : status === 'rejected' ? '❌ Rejected' : `⚠️ ${status}`;
    prisma.activityLog.create({
      data: {
        userId: capability.createdByUserId,
        action: 'marketplace_capability_reviewed',
        actor: 'system',
        summary: `${label}: Your capability "${capability.name}" has been ${status} on the managed marketplace.${reason ? ` Reason: ${reason}` : ''}`,
        metadata: JSON.stringify({ capabilityId: capability.id, status, reason }),
      },
    }).catch(() => {});
  }

  console.log(
    `[marketplace-webhook] capability_approval: "${capability.name}" (${capability.id}) ${previousStatus} → ${status}` +
    (reason ? ` (reason: ${reason})` : '') +
    (sourceInstance ? ` from ${sourceInstance.name}` : '')
  );

  return NextResponse.json({
    received: true,
    event: 'capability_approval',
    capabilityId: capability.id,
    name: capability.name,
    previousStatus,
    newStatus: status,
    reason: reason || null,
    processedAt: new Date().toISOString(),
  });
}

/**
 * Handle instance_status events.
 * Received when the platform admin activates/deactivates this instance.
 * Logs the event — the instance can use this to show a banner or restrict functionality.
 */
async function handleInstanceStatus(
  body: any,
  sourceInstance: { id: string; name: string; baseUrl: string } | null
) {
  const { instanceId, status } = body;

  if (!status) {
    return NextResponse.json(
      { error: 'status is required for instance_status events' },
      { status: 400 }
    );
  }

  console.log(
    `[marketplace-webhook] instance_status: ${status}` +
    (instanceId ? ` (instanceId=${instanceId})` : '') +
    (sourceInstance ? ` from ${sourceInstance.name}` : '')
  );

  // Store the status change as a system activity
  // Use a well-known userId or skip if no users exist
  const admin = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
  if (admin) {
    prisma.activityLog.create({
      data: {
        userId: admin.id,
        action: 'federation_instance_status',
        actor: 'system',
        summary: `Instance ${status === 'active' ? 'activated' : 'deactivated'} by managed marketplace admin.`,
        metadata: JSON.stringify({ instanceId, status, timestamp: body.timestamp }),
      },
    }).catch(() => {});
  }

  return NextResponse.json({
    received: true,
    event: 'instance_status',
    status,
    message: `Instance status '${status}' acknowledged.`,
    processedAt: new Date().toISOString(),
  });
}