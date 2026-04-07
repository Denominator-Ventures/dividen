import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';
import { sseManager } from '@/lib/sse-stream';

export const dynamic = 'force-dynamic';

// POST /api/v2/shared-chat/send - Send message as agent
export async function POST(request: NextRequest) {
  const auth = await authenticateAgent(request, 'chat');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { content, metadata } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return jsonError('Missing or empty required field: content', 400);
    }

    if (content.length > 10000) {
      return jsonError('Message content exceeds 10,000 character limit', 400);
    }

    const agentName = request.headers.get('x-agent-name') || auth.keyName;

    // Save message to database
    const message = await prisma.chatMessage.create({
      data: {
        role: 'assistant',
        content: content.trim(),
        userId: auth.userId,
        metadata: JSON.stringify({
          ...(metadata || {}),
          agentName,
          agentKeyId: auth.keyId,
          sentViaApi: true,
        }),
      },
    });

    // Broadcast to connected SSE clients
    sseManager.sendNewMessage(auth.userId, {
      id: message.id,
      role: message.role,
      content: message.content,
      agentName,
      createdAt: message.createdAt.toISOString(),
    });

    return jsonSuccess({
      id: message.id,
      role: message.role,
      content: message.content,
      agentName,
      createdAt: message.createdAt.toISOString(),
    }, 201);
  } catch (error) {
    return jsonError('Failed to send message', 500);
  }
}
