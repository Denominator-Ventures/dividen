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
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

async function _GET(request: NextRequest) {
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

  // Build query — only show non-cleared messages
  const where: any = { userId, clearedAt: null };
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
  const rawMessages = messages.reverse().map((m: any) => ({
    id: m.id,
    role: m.role,
    content: m.role === 'assistant' ? stripActionTags(m.content) : m.content,
    createdAt: m.createdAt.toISOString(),
    metadata: m.metadata ? JSON.parse(m.metadata) : null,
  }));

  // Rehydrate current relay status for any message that has relayContext
  // This ensures purple cards collapse to "resolved" once the relay is completed/dismissed,
  // even if the resolution happened outside this chat flow.
  const relayIds = new Set<string>();
  for (const msg of rawMessages) {
    const rc = (msg as any).metadata?.relayContext;
    if (Array.isArray(rc)) for (const r of rc) if (r?.id) relayIds.add(r.id);
  }
  let statusById: Record<string, { status: string; resolvedAt: Date | null }> = {};
  if (relayIds.size > 0) {
    const current = await prisma.agentRelay.findMany({
      where: { id: { in: Array.from(relayIds) } },
      select: { id: true, status: true, resolvedAt: true },
    });
    statusById = Object.fromEntries(current.map((r: any) => [r.id, { status: r.status, resolvedAt: r.resolvedAt }]));
  }
  const cleanMessages = rawMessages.map((msg: any) => {
    if (msg.metadata?.relayContext && Array.isArray(msg.metadata.relayContext)) {
      msg.metadata.relayContext = msg.metadata.relayContext.map((r: any) => {
        const live = statusById[r.id];
        if (!live) return r;
        return { ...r, status: live.status, resolvedAt: live.resolvedAt ? live.resolvedAt.toISOString() : null };
      });
    }
    return msg;
  });

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
 * Marks messages as cleared (soft delete) rather than hard-deleting.
 * This preserves the conversation record so Divi retains learned context,
 * but starts the visible conversation fresh.
 */
/**
 * POST /api/chat/messages
 * Save a single message to chat history (used for system-injected messages
 * that need to persist so the LLM sees them in conversation context).
 */
async function _POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const body = await request.json();
  const { role, content, metadata } = body;
  if (!role || !content) {
    return NextResponse.json({ success: false, error: 'role and content required' }, { status: 400 });
  }
  const msg = await prisma.chatMessage.create({
    data: {
      role,
      content,
      userId,
      ...(metadata ? { metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata) } : {}),
    },
  });
  return NextResponse.json({ success: true, data: msg });
}

async function _DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const now = new Date();

  // Soft-clear: mark all non-cleared messages as cleared
  await prisma.chatMessage.updateMany({
    where: { userId, clearedAt: null },
    data: { clearedAt: now },
  });

  return NextResponse.json({ success: true });
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
export const DELETE = withTelemetry(_DELETE);
