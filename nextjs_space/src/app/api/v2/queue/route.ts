import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET /api/v2/queue - List queue items with optional status filter
export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request, 'queue');
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const type = searchParams.get('type');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: Record<string, unknown> = { userId: auth.userId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (type) where.type = type;

  try {
    const [items, total] = await Promise.all([
      prisma.queueItem.findMany({
        where,
        orderBy: [
          { status: 'asc' },
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.queueItem.count({ where }),
    ]);

    return jsonSuccess({
      items,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    return jsonError('Failed to fetch queue items', 500);
  }
}
