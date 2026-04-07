import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['ready', 'in_progress', 'done_today', 'blocked'];

// POST /api/v2/queue/:id/status - Update item status
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateAgent(request, 'queue');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return jsonError(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const item = await prisma.queueItem.findUnique({
      where: { id: params.id },
    });

    if (!item) {
      return jsonError('Queue item not found', 404);
    }

    const updated = await prisma.queueItem.update({
      where: { id: params.id },
      data: { status },
    });

    return jsonSuccess(updated);
  } catch (error) {
    return jsonError('Failed to update status', 500);
  }
}
