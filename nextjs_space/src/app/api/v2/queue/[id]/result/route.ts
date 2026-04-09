import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';
import { onTaskComplete } from '@/lib/cos-sequential-dispatch';

export const dynamic = 'force-dynamic';

// POST /api/v2/queue/:id/result - Report task completion with result
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateAgent(request, 'queue');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { result, status } = body;

    if (!result) {
      return jsonError('Missing required field: result', 400);
    }

    const item = await prisma.queueItem.findUnique({
      where: { id: params.id },
    });

    if (!item || item.userId !== auth.userId) {
      return jsonError('Queue item not found', 404);
    }

    // Merge result into metadata
    let existingMetadata: Record<string, unknown> = {};
    if (item.metadata) {
      try { existingMetadata = JSON.parse(item.metadata); } catch { /* ignore */ }
    }

    const updatedMetadata = {
      ...existingMetadata,
      agentResult: result,
      completedBy: auth.keyName,
      completedAt: new Date().toISOString(),
    };

    const finalStatus = status || 'done_today';
    const updated = await prisma.queueItem.update({
      where: { id: params.id },
      data: {
        status: finalStatus,
        metadata: JSON.stringify(updatedMetadata),
      },
    });

    // CoS sequential dispatch on completion
    let autoDispatched = null;
    if (finalStatus === 'done_today') {
      const dispatchResult = await onTaskComplete(auth.userId, params.id);
      if (dispatchResult.dispatched) {
        autoDispatched = dispatchResult.item;
      }
    }

    return jsonSuccess({ ...updated, autoDispatched });
  } catch (error) {
    return jsonError('Failed to report result', 500);
  }
}
