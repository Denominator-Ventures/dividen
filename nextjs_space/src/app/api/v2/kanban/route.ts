import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET /api/v2/kanban - List all kanban cards (read-only)
export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request, 'kanban');
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const assignee = searchParams.get('assignee');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: Record<string, unknown> = { userId: auth.userId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignee) where.assignee = assignee;

  try {
    const [cards, total] = await Promise.all([
      prisma.kanbanCard.findMany({
        where,
        include: {
          checklist: { orderBy: { order: 'asc' } },
          contacts: {
            include: {
              contact: {
                select: { id: true, name: true, email: true, company: true },
              },
            },
          },
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.kanbanCard.count({ where }),
    ]);

    return jsonSuccess({
      cards,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    return jsonError('Failed to fetch kanban cards', 500);
  }
}
