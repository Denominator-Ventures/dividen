/**
 * GET /api/chat/messages
 * 
 * Fetch chat history with pagination.
 * Query params: ?limit=50&cursor=<messageId>&direction=before
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripActionTags } from '@/lib/action-tags';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const cursor = searchParams.get('cursor');

  // Build query
  const where: any = { userId };
  const queryOptions: any = {
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  };

  // Cursor-based pagination
  if (cursor) {
    queryOptions.cursor = { id: cursor };
    queryOptions.skip = 1; // Skip the cursor item itself
  }

  const messages = await prisma.chatMessage.findMany(queryOptions);

  // Strip action tags from assistant messages for client display
  const cleanMessages = messages.reverse().map((m) => ({
    id: m.id,
    role: m.role,
    content: m.role === 'assistant' ? stripActionTags(m.content) : m.content,
    createdAt: m.createdAt.toISOString(),
    metadata: m.metadata ? JSON.parse(m.metadata) : null,
  }));

  // Check if there are more messages
  const hasMore = messages.length === limit;
  const nextCursor = hasMore ? messages[0]?.id : null; // oldest message in this batch

  return NextResponse.json({
    success: true,
    data: {
      messages: cleanMessages,
      hasMore,
      nextCursor,
    },
  });
}

/**
 * DELETE /api/chat/messages
 * 
 * Clear chat history for the authenticated user.
 */
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;

  await prisma.chatMessage.deleteMany({
    where: { userId },
  });

  return NextResponse.json({ success: true });
}
