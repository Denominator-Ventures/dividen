export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgent, isAuthError, AgentContext } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { logRequest, logError, getClientIp } from '@/lib/telemetry';

/**
 * POST /api/a2a
 * 
 * A2A (Agent-to-Agent) Protocol endpoint.
 * Receives A2A tasks and maps them to DiviDen relays.
 * 
 * Per Google A2A spec:
 * - Tasks are the unit of work
 * - Messages carry content parts
 * - Artifacts are output products
 * 
 * Authentication: Bearer token (same as Agent API v2)
 */
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
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { method, params } = body;

  try {
    switch (method) {
      // ── Send Task (A2A → DiviDen Relay) ─────────────────────────────────
      case 'tasks/send': {
        const { id: taskId, message, metadata } = params || {};
        if (!message) {
          return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Extract content from A2A message parts
        const textParts = (message.parts || []).filter((p: any) => p.type === 'text');
        const dataParts = (message.parts || []).filter((p: any) => p.type === 'data');
        const subject = textParts[0]?.text || 'A2A Task';
        const payload = dataParts[0]?.data || null;

        // Find the connection to route through
        // If metadata.connectionId is provided, use it directly
        // Otherwise, find the first active connection
        let connectionId = metadata?.connectionId;
        if (!connectionId) {
          const firstConnection = await prisma.connection.findFirst({
            where: {
              status: 'active',
              OR: [{ requesterId: userId }, { accepterId: userId }],
            },
          });
          if (!firstConnection) {
            return NextResponse.json({ error: 'No active connections to route task through' }, { status: 400 });
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
          return NextResponse.json({ error: 'Connection not found or not active' }, { status: 404 });
        }

        const toUserId = connection.requesterId === userId ? connection.accepterId : connection.requesterId;

        // Map A2A task to DiviDen relay
        const relay = await prisma.agentRelay.create({
          data: {
            connectionId,
            fromUserId: userId,
            toUserId,
            direction: 'outbound',
            type: 'request',
            intent: metadata?.intent || 'custom',
            subject,
            payload: payload ? JSON.stringify(payload) : null,
            status: 'pending',
            priority: metadata?.priority || 'normal',
            dueDate: metadata?.dueDate ? new Date(metadata.dueDate) : null,
          },
        });

        // Notify recipient
        if (toUserId) {
          await prisma.commsMessage.create({
            data: {
              sender: 'system',
              content: `🌐 A2A Task received: ${subject}`,
              state: 'new',
              priority: metadata?.priority || 'normal',
              userId: toUserId,
              metadata: JSON.stringify({ type: 'a2a_task', relayId: relay.id }),
            },
          });
        }

        // Return A2A task response
        logRequest({ userId, ip, method: 'POST', path: '/api/a2a', statusCode: 200, duration: Date.now() - start });
        return NextResponse.json({
          id: taskId || relay.id,
          status: { state: 'submitted' },
          relayId: relay.id,
        });
      }

      // ── Get Task Status ────────────────────────────────────────────────
      case 'tasks/get': {
        const { id: relayId } = params || {};
        if (!relayId) {
          return NextResponse.json({ error: 'Task ID (relayId) is required' }, { status: 400 });
        }

        const relay = await prisma.agentRelay.findFirst({
          where: {
            id: relayId,
            OR: [{ fromUserId: userId }, { toUserId: userId }],
          },
        });

        if (!relay) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Map relay status to A2A task states
        const stateMap: Record<string, string> = {
          pending: 'submitted',
          delivered: 'working',
          agent_handling: 'working',
          user_review: 'input-required',
          completed: 'completed',
          declined: 'failed',
          expired: 'failed',
        };

        const response: any = {
          id: relay.id,
          status: { state: stateMap[relay.status] || 'working' },
        };

        // If completed, include artifacts
        if (relay.status === 'completed' && relay.responsePayload) {
          let responseData: any;
          try { responseData = JSON.parse(relay.responsePayload); } catch { responseData = relay.responsePayload; }
          response.artifacts = [{
            parts: [
              { type: 'data', data: responseData },
            ],
          }];
        }

        return NextResponse.json(response);
      }

      // ── Cancel Task ────────────────────────────────────────────────────
      case 'tasks/cancel': {
        const { id: relayId } = params || {};
        if (!relayId) {
          return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const relay = await prisma.agentRelay.findFirst({
          where: {
            id: relayId,
            fromUserId: userId,
            status: { in: ['pending', 'delivered', 'agent_handling'] },
          },
        });

        if (!relay) {
          return NextResponse.json({ error: 'Task not found or cannot be cancelled' }, { status: 404 });
        }

        await prisma.agentRelay.update({
          where: { id: relayId },
          data: { status: 'declined', resolvedAt: new Date() },
        });

        return NextResponse.json({ id: relayId, status: { state: 'canceled' } });
      }

      default:
        return NextResponse.json({ error: `Unknown method: ${method}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('POST /api/a2a error:', error);
    logError({ userId, ip, path: '/api/a2a', method: 'POST', errorMessage: error?.message || 'Unknown', errorStack: error?.stack, metadata: { a2aMethod: body?.method } });
    logRequest({ userId, ip, method: 'POST', path: '/api/a2a', statusCode: 500, duration: Date.now() - start });
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
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
    version: '0.1.0',
    description: 'Agent-to-Agent protocol endpoint for DiviDen. Send tasks, check status, cancel tasks.',
    methods: ['tasks/send', 'tasks/get', 'tasks/cancel'],
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
