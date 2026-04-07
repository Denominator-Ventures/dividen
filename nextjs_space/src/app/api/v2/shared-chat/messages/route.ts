import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET /api/v2/shared-chat/messages - Get chat history
export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request, 'chat');
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const cursor = searchParams.get('cursor');
  const role = searchParams.get('role');

  try {
    const where: Record<string, unknown> = { userId: auth.userId };
    if (role) where.role = role;

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return jsonSuccess({
      messages: items.reverse(), // chronological order
      pagination: { limit, cursor: nextCursor, hasMore },
    });
  } catch (error) {
    return jsonError('Failed to fetch messages', 500);
  }
}
