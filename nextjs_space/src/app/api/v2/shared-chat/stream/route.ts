import { NextRequest } from 'next/server';
import { authenticateAgent, isAuthError, jsonError } from '@/lib/api-auth';
import { sseManager, SSEClient } from '@/lib/sse-stream';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minute max for SSE

// GET /api/v2/shared-chat/stream - SSE endpoint for real-time updates
export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request, 'chat');
  if (isAuthError(auth)) return auth;

  const clientId = `sse_${auth.keyId}_${Date.now()}`;
  const agentName = request.headers.get('x-agent-name') || auth.keyName;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        type: 'connected',
        clientId,
        agentName,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Register client
      const client: SSEClient = {
        id: clientId,
        keyId: auth.keyId,
        userId: auth.userId,
        agentName,
        controller,
        connectedAt: Date.now(),
        lastPing: Date.now(),
      };
      sseManager.addClient(client);
    },
    cancel() {
      sseManager.removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
