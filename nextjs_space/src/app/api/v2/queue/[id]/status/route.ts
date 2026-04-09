import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';
import { validateStatusTransition, onTaskComplete } from '@/lib/cos-sequential-dispatch';

export const dynamic = 'force-dynamic';

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

    const item = await prisma.queueItem.findUnique({
      where: { id: params.id },
    });

    if (!item || item.userId !== auth.userId) {
      return jsonError('Queue item not found', 404);
    }

    // Status transition guard
    const validation = validateStatusTransition(item.status, status);
    if (!validation.valid) {
      return jsonError(validation.error!, 400);
    }

    const updated = await prisma.queueItem.update({
      where: { id: params.id },
      data: { status },
    });

    // CoS sequential dispatch on completion
    let autoDispatched = null;
    if (status === 'done_today') {
      const dispatchResult = await onTaskComplete(auth.userId, params.id);
      if (dispatchResult.dispatched) {
        autoDispatched = dispatchResult.item;
      }
    }

    return jsonSuccess({ ...updated, autoDispatched });
  } catch (error) {
    return jsonError('Failed to update status', 500);
  }
}
