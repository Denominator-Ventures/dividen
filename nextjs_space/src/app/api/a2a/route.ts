export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgent, isAuthError, AgentContext } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { logRequest, logError, getClientIp } from '@/lib/telemetry';
import { syncQueueWithRelayCompletion, createQueueItemFromRelay } from '@/lib/relay-queue-bridge';
import { pushTaskDispatched, pushQueueChanged, pushRelayStateChanged } from '@/lib/webhook-push';
import { randomUUID } from 'crypto';

/**
 * POST /api/a2a
 *
 * A2A (Agent-to-Agent) Protocol endpoint.
 * Full implementation per FVP Integration Brief:
 *   - tasks/send        — Create a task (relay), with optional threadId
 *   - tasks/get          — Get task status + artifacts
 *   - tasks/respond       — Complete a task with optional typed artifacts
 *   - tasks/cancel        — Cancel a pending task
 *   - tasks/list          — List tasks (filter by thread, status, connection)
 *   - tasks/update_status — Update task status with progress message
 *   - agent/info          — Return agent metadata
 *
 * Authentication: Bearer token (DiviDen API key)
 */

// ── Artifact Type Validation ──
const ARTIFACT_TYPES = ['text', 'code', 'document', 'data', 'contact_card', 'calendar_invite', 'email_draft'] as const;
type ArtifactType = typeof ARTIFACT_TYPES[number];

interface A2AArtifact {
  type: ArtifactType;
  title?: string;
  mimeType?: string;
  parts: Array<{ type: 'text'; text: string } | { type: 'data'; data: any }>;
}

function validateArtifacts(artifacts: any[]): A2AArtifact[] | null {
  if (!Array.isArray(artifacts)) return null;
  return artifacts.map(a => ({
    type: ARTIFACT_TYPES.includes(a.type) ? a.type : 'text',
    title: a.title || undefined,
    mimeType: a.mimeType || undefined,
    parts: Array.isArray(a.parts) ? a.parts : [{ type: 'text', text: String(a.data || a.text || '') }],
  }));
}

// ── A2A State Mapping ──
const RELAY_TO_A2A_STATE: Record<string, string> = {
  pending: 'submitted',
  delivered: 'working',
  agent_handling: 'working',
  user_review: 'input-required',
  completed: 'completed',
  declined: 'failed',
  expired: 'failed',
};

export async function POST(req: NextRequest) {
  const start = Date.now();
  const ip = getClientIp(req.headers);

  // Authenticate
  const auth = await authenticateAgent(req, 'a2a');
  if (isAuthError(auth)) return auth;
  const agent = auth as AgentContext;
  const userId = agent.userId;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ jsonrpc: '2.0', error: { code: -32700, message: 'Invalid JSON' } }, { status: 400 });
  }

  const { jsonrpc, id: rpcId, method, params } = body;

  // Wrap response in JSON-RPC envelope if client sent jsonrpc field
  const respond = (result: any, status = 200) => {
    if (jsonrpc === '2.0') {
      return NextResponse.json({ jsonrpc: '2.0', id: rpcId ?? null, result }, { status });
    }
    return NextResponse.json(result, { status });
  };
  const respondError = (code: number, message: string, status = 400) => {
    if (jsonrpc === '2.0') {
      return NextResponse.json({ jsonrpc: '2.0', id: rpcId ?? null, error: { code, message } }, { status });
    }
    return NextResponse.json({ error: message }, { status });
  };

  try {
    switch (method) {
      // ── Send Task (A2A → DiviDen Relay) ─────────────────────────────────
      case 'tasks/send': {
        const { id: taskId, message, metadata, threadId: requestedThreadId } = params || {};
        if (!message) {
          return respondError(-32602, 'Message is required');
        }

        // Extract content from A2A message parts
        const textParts = (message.parts || []).filter((p: any) => p.type === 'text');
        const dataParts = (message.parts || []).filter((p: any) => p.type === 'data');
        const subject = textParts[0]?.text || 'A2A Task';
        const rawPayload = dataParts[0]?.data || null;

        // Merge widget definitions from metadata into the payload
        // This allows remote agents to send interactive widgets as part of tasks
        const payload = rawPayload || {};
        if (typeof payload === 'object' && metadata?.widgets) {
          payload.widgets = metadata.widgets;
        }
        if (typeof payload === 'object' && metadata?.widgetResponseUrl) {
          payload.widgetResponseUrl = metadata.widgetResponseUrl;
        }

        // Resolve connection
        let connectionId = metadata?.connectionId;
        if (!connectionId) {
          const firstConnection = await prisma.connection.findFirst({
            where: {
              status: 'active',
              OR: [{ requesterId: userId }, { accepterId: userId }],
            },
          });
          if (!firstConnection) {
            return respondError(-32000, 'No active connections to route task through');
          }
          connectionId = firstConnection.id;
        }

        const connection = await prisma.connection.findFirst({
          where: {
            id: connectionId,
            status: 'active',
            OR: [{ requesterId: userId }, { accepterId: userId }],
          },
        });
        if (!connection) {
          return respondError(-32001, 'Connection not found or not active', 404);
        }

        const toUserId = connection.requesterId === userId ? connection.accepterId : connection.requesterId;

        // Threading: use provided threadId, inherit from parent, or generate new
        let threadId = requestedThreadId || null;
        if (!threadId && metadata?.parentRelayId) {
          const parent = await prisma.agentRelay.findUnique({
            where: { id: metadata.parentRelayId },
            select: { threadId: true },
          });
          threadId = parent?.threadId || null;
        }
        if (!threadId) {
          threadId = `thread_${randomUUID().replace(/-/g, '').substring(0, 16)}`;
        }

        // Create relay
        const relay = await prisma.agentRelay.create({
          data: {
            connectionId,
            fromUserId: userId,
            toUserId,
            direction: 'outbound',
            type: 'request',
            intent: metadata?.intent || 'custom',
            subject,
            payload: (payload && Object.keys(payload).length > 0) ? JSON.stringify(payload) : null,
            status: 'pending',
            priority: metadata?.priority || 'normal',
            dueDate: metadata?.dueDate ? new Date(metadata.dueDate) : null,
            threadId,
            parentRelayId: metadata?.parentRelayId || null,
            teamId: metadata?.teamId || null,
            projectId: metadata?.projectId || null,
          },
        });

        // If the inbound task carries interactive widgets, auto-create a linked queue item
        // so the user sees it in their queue with widget controls rendered
        if (toUserId && typeof payload === 'object' && payload.widgets?.length) {
          createQueueItemFromRelay(
            { id: relay.id, subject, payload: relay.payload, fromUserId: userId, toUserId },
            toUserId
          ).then((queueItemId) => {
            if (queueItemId) {
              pushQueueChanged(toUserId, { changeType: 'added', itemId: queueItemId, itemTitle: subject });
            }
          }).catch((err) => console.error('[A2A] Widget queue item creation failed:', err));
        }

        // Log as activity (comms is now relay-based — the relay itself is the record)
        if (toUserId) {
          await prisma.activityLog.create({
            data: {
              action: 'relay_sent',
              actor: 'system',
              summary: `A2A task received: ${subject}`,
              userId: toUserId,
              metadata: JSON.stringify({ type: 'a2a_task', relayId: relay.id, threadId }),
            },
          }).catch(() => {});
        }

        // Push webhook
        pushRelayStateChanged(userId, {
          relayId: relay.id,
          threadId,
          previousState: null,
          newState: 'pending',
          subject,
        });

        logRequest({ userId, ip, method: 'POST', path: '/api/a2a', statusCode: 200, duration: Date.now() - start });
        return respond({
          id: taskId || relay.id,
          status: { state: 'submitted' },
          relayId: relay.id,
          threadId,
        });
      }

      // ── Get Task Status ────────────────────────────────────────────────
      case 'tasks/get': {
        const { id: relayId } = params || {};
        if (!relayId) {
          return respondError(-32602, 'Task ID (relayId) is required');
        }

        const relay = await prisma.agentRelay.findFirst({
          where: {
            id: relayId,
            OR: [{ fromUserId: userId }, { toUserId: userId }],
          },
        });

        if (!relay) {
          return respondError(-32001, 'Task not found', 404);
        }

        const response: any = {
          id: relay.id,
          status: { state: RELAY_TO_A2A_STATE[relay.status] || 'working' },
          threadId: relay.threadId,
          parentRelayId: relay.parentRelayId,
          intent: relay.intent,
          priority: relay.priority,
          createdAt: relay.createdAt,
          resolvedAt: relay.resolvedAt,
        };

        // Include typed artifacts if completed
        if (relay.status === 'completed') {
          if (relay.artifacts) {
            try {
              response.artifacts = JSON.parse(relay.artifacts);
            } catch {
              response.artifacts = [{ type: 'text', parts: [{ type: 'text', text: relay.artifacts }] }];
            }
          } else if (relay.responsePayload) {
            let responseData: any;
            try { responseData = JSON.parse(relay.responsePayload); } catch { responseData = relay.responsePayload; }
            response.artifacts = [{
              type: relay.artifactType || 'data',
              parts: [{ type: 'data', data: responseData }],
            }];
          }
        }

        // Thread context: how many messages in this thread
        if (relay.threadId) {
          const threadCount = await prisma.agentRelay.count({ where: { threadId: relay.threadId } });
          response.thread = { id: relay.threadId, messageCount: threadCount };
        }

        return respond(response);
      }

      // ── List Tasks ──────────────────────────────────────────────────────
      case 'tasks/list': {
        const { threadId, status: filterStatus, connectionId, limit, cursor } = params || {};
        const where: any = { OR: [{ fromUserId: userId }, { toUserId: userId }] };
        if (threadId) where.threadId = threadId;
        if (filterStatus) {
          // Accept A2A states or relay states
          const reverseMap: Record<string, string[]> = {
            submitted: ['pending'],
            working: ['delivered', 'agent_handling'],
            'input-required': ['user_review'],
            completed: ['completed'],
            failed: ['declined', 'expired'],
          };
          where.status = { in: reverseMap[filterStatus] || [filterStatus] };
        }
        if (connectionId) where.connectionId = connectionId;
        if (cursor) where.createdAt = { lt: new Date(cursor) };

        const take = Math.min(limit || 20, 50);
        const relays = await prisma.agentRelay.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true,
            threadId: true,
            subject: true,
            status: true,
            priority: true,
            intent: true,
            direction: true,
            artifactType: true,
            createdAt: true,
            resolvedAt: true,
            parentRelayId: true,
          },
        });

        return respond({
          tasks: relays.map((r: any) => ({
            id: r.id,
            threadId: r.threadId,
            subject: r.subject,
            status: { state: RELAY_TO_A2A_STATE[r.status] || 'working' },
            priority: r.priority,
            intent: r.intent,
            direction: r.direction,
            artifactType: r.artifactType,
            parentRelayId: r.parentRelayId,
            createdAt: r.createdAt,
            resolvedAt: r.resolvedAt,
          })),
          nextCursor: relays.length === take ? relays[relays.length - 1].createdAt.toISOString() : null,
        });
      }

      // ── Update Task Status ─────────────────────────────────────────────
      case 'tasks/update_status': {
        const { id: relayId, status: newStatus, message: statusMessage } = params || {};
        if (!relayId) {
          return respondError(-32602, 'Task ID is required');
        }

        const relay = await prisma.agentRelay.findFirst({
          where: {
            id: relayId,
            OR: [{ fromUserId: userId }, { toUserId: userId }],
            status: { notIn: ['completed', 'declined', 'expired'] },
          },
        });

        if (!relay) {
          return respondError(-32001, 'Task not found or already terminal', 404);
        }

        // Map A2A states to relay states
        const a2aToRelay: Record<string, string> = {
          working: 'agent_handling',
          'input-required': 'user_review',
          submitted: 'pending',
        };
        const mappedStatus = a2aToRelay[newStatus] || newStatus;
        const validStatuses = ['pending', 'delivered', 'agent_handling', 'user_review'];
        if (!validStatuses.includes(mappedStatus)) {
          return respondError(-32602, `Invalid non-terminal status: ${newStatus}. Use tasks/respond for completion.`);
        }

        const previousState = relay.status;
        await prisma.agentRelay.update({
          where: { id: relayId },
          data: { status: mappedStatus },
        });

        // Log progress as activity (comms is now relay-based)
        if (statusMessage) {
          const recipientId = relay.fromUserId === userId ? relay.toUserId : relay.fromUserId;
          if (recipientId) {
            await prisma.activityLog.create({
              data: {
                action: 'relay_responded',
                actor: 'system',
                summary: `Task update [${relay.subject}]: ${statusMessage}`,
                userId: recipientId,
                metadata: JSON.stringify({ type: 'a2a_status_update', relayId, threadId: relay.threadId }),
              },
            }).catch(() => {});
          }
        }

        // Push webhook
        pushRelayStateChanged(userId, {
          relayId,
          threadId: relay.threadId,
          previousState,
          newState: mappedStatus,
          subject: relay.subject,
          message: statusMessage,
        });

        return respond({
          id: relayId,
          status: { state: RELAY_TO_A2A_STATE[mappedStatus] || mappedStatus },
          threadId: relay.threadId,
        });
      }

      // ── Cancel Task ────────────────────────────────────────────────────
      case 'tasks/cancel': {
        const { id: relayId } = params || {};
        if (!relayId) {
          return respondError(-32602, 'Task ID is required');
        }

        const relay = await prisma.agentRelay.findFirst({
          where: {
            id: relayId,
            fromUserId: userId,
            status: { in: ['pending', 'delivered', 'agent_handling'] },
          },
        });

        if (!relay) {
          return respondError(-32001, 'Task not found or cannot be cancelled', 404);
        }

        const previousState = relay.status;
        await prisma.agentRelay.update({
          where: { id: relayId },
          data: { status: 'declined', resolvedAt: new Date() },
        });

        pushRelayStateChanged(userId, {
          relayId,
          threadId: relay.threadId,
          previousState,
          newState: 'declined',
          subject: relay.subject,
        });

        return respond({ id: relayId, status: { state: 'canceled' }, threadId: relay.threadId });
      }

      // ── Respond to Task (with typed artifacts) ──────────────────────────
      case 'tasks/respond': {
        const { id: relayId, result, status: taskStatus, artifacts: rawArtifacts, artifactType } = params || {};
        if (!relayId) {
          return respondError(-32602, 'Task ID (relayId) is required');
        }

        // Process typed artifacts if provided
        let validatedArtifacts: A2AArtifact[] | null = null;
        if (rawArtifacts) {
          validatedArtifacts = validateArtifacts(rawArtifacts);
        }

        // Store artifacts on the relay before bridge sync
        if (validatedArtifacts || artifactType) {
          await prisma.agentRelay.update({
            where: { id: relayId },
            data: {
              ...(validatedArtifacts ? { artifacts: JSON.stringify(validatedArtifacts) } : {}),
              ...(artifactType && ARTIFACT_TYPES.includes(artifactType) ? { artifactType } : {}),
            },
          });
        }

        // Sync relay completion → queue via bridge
        const bridgeResult = await syncQueueWithRelayCompletion(relayId, userId, result);

        // Get relay for webhook context
        const relay = await prisma.agentRelay.findUnique({ where: { id: relayId }, select: { threadId: true, subject: true, status: true } });

        // Push webhooks
        if (bridgeResult.dispatched && bridgeResult.itemTitle) {
          pushQueueChanged(userId, {
            changeType: 'status_changed',
            itemId: relayId,
            itemTitle: bridgeResult.itemTitle,
            newStatus: 'done_today',
          });
        }
        pushRelayStateChanged(userId, {
          relayId,
          threadId: relay?.threadId,
          previousState: 'agent_handling',
          newState: taskStatus === 'failed' ? 'declined' : 'completed',
          subject: relay?.subject || 'Unknown',
          hasArtifacts: !!validatedArtifacts,
          artifactType: artifactType || validatedArtifacts?.[0]?.type,
        });

        logRequest({ userId, ip, method: 'POST', path: '/api/a2a', statusCode: 200, duration: Date.now() - start });
        return respond({
          id: relayId,
          status: { state: taskStatus === 'failed' ? 'failed' : 'completed' },
          threadId: relay?.threadId,
          autoDispatched: bridgeResult.dispatched,
          artifacts: validatedArtifacts ? validatedArtifacts.length : 0,
        });
      }

      // ── Agent Info ──────────────────────────────────────────────────────
      case 'agent/info': {
        const fedConfig = await prisma.federationConfig.findFirst();
        const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
        const proto = req.headers.get('x-forwarded-proto') || 'https';
        const baseUrl = fedConfig?.instanceUrl || `${proto}://${host}`;

        return respond({
          name: fedConfig?.instanceName || 'DiviDen',
          version: '0.4.0',
          protocol: 'a2a',
          protocolVersion: '0.2',
          capabilities: {
            threading: true,
            structuredArtifacts: true,
            statusUpdates: true,
            webhookPush: true,
            marketplacePasswordAccess: true,
            persistentConversation: true,
          },
          supportedArtifactTypes: ARTIFACT_TYPES,
          methods: ['tasks/send', 'tasks/get', 'tasks/list', 'tasks/respond', 'tasks/cancel', 'tasks/update_status', 'agent/info'],
          endpoints: {
            a2a: `${baseUrl}/api/a2a`,
            mcp: `${baseUrl}/api/mcp`,
            agentCard: `${baseUrl}/.well-known/agent-card.json`,
            playbook: `${baseUrl}/api/a2a/playbook`,
          },
        });
      }

      default:
        return respondError(-32601, `Unknown method: ${method}`);
    }
  } catch (error: any) {
    console.error('POST /api/a2a error:', error);
    logError({ userId, ip, path: '/api/a2a', method: 'POST', errorMessage: error?.message || 'Unknown', errorStack: error?.stack, metadata: { a2aMethod: body?.method } });
    logRequest({ userId, ip, method: 'POST', path: '/api/a2a', statusCode: 500, duration: Date.now() - start });
    return respondError(-32603, error.message || 'Internal error', 500);
  }
}

/**
 * GET /api/a2a
 *
 * Returns A2A endpoint metadata for discovery.
 */
export async function GET() {
  return NextResponse.json({
    name: 'DiviDen A2A Endpoint',
    version: '0.4.0',
    description: 'Agent-to-Agent protocol endpoint for DiviDen. Supports threaded conversations, typed artifacts, status updates, webhook push, marketplace password-based access, and persistent conversation threads.',
    methods: ['tasks/send', 'tasks/get', 'tasks/list', 'tasks/respond', 'tasks/cancel', 'tasks/update_status', 'agent/info'],
    capabilities: {
      threading: true,
      structuredArtifacts: true,
      statusUpdates: true,
      webhookPush: true,
      marketplacePasswordAccess: true,
      persistentConversation: true,
    },
    supportedArtifactTypes: ARTIFACT_TYPES,
    authentication: {
      type: 'bearer',
      description: 'Use a DiviDen API key as Bearer token.',
    },
    agentCard: '/.well-known/agent-card.json',
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * OPTIONS /api/a2a — CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
