import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/activity/stream — Server-Sent Events endpoint for real-time activity updates.
 * Sends new activity items as they appear, plus a heartbeat every 15s.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!((session?.user as any)?.id)) {
    return new Response('Unauthorized', { status: 401 });
  }
  const userId = (session!.user as any).id;

  const encoder = new TextEncoder();
  let closed = false;
  let lastId: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`));

      const poll = async () => {
        if (closed) return;

        try {
          const where: Record<string, unknown> = { userId };
          if (lastId) {
            // Fetch only newer items by checking ID (cuid is lexicographically sortable)
            const lastItem = await prisma.activityLog.findUnique({ where: { id: lastId }, select: { createdAt: true } });
            if (lastItem) {
              where.createdAt = { gt: lastItem.createdAt };
            }
          }

          const items = await prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: lastId ? 20 : 5, // First batch small, subsequent fetches bigger
          });

          if (items.length > 0) {
            lastId = items[0].id;
            for (const item of items.reverse()) {
              const data = {
                id: item.id,
                action: item.action,
                actor: item.actor,
                summary: item.summary,
                time: item.createdAt.toISOString(),
              };
              try {
                controller.enqueue(encoder.encode(`event: activity\ndata: ${JSON.stringify(data)}\n\n`));
              } catch {
                closed = true;
                return;
              }
            }
          }

          // Heartbeat
          try {
            controller.enqueue(encoder.encode(`: heartbeat ${new Date().toISOString()}\n\n`));
          } catch {
            closed = true;
            return;
          }
        } catch (err) {
          console.error('SSE poll error:', err);
        }

        // Poll every 5 seconds
        if (!closed) {
          setTimeout(poll, 5000);
        }
      };

      // Start polling
      await poll();

      // Clean up on abort
      req.signal.addEventListener('abort', () => {
        closed = true;
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
