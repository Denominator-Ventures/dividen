import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';
import { pushQueueChanged } from '@/lib/webhook-push';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v2/queue/:id/confirm
 * Approve or reject a pending_confirmation queue item.
 * Body: { action: 'approve' | 'reject' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateAgent(request, 'queue');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { action } = body;

    if (!['approve', 'reject'].includes(action)) {
      return jsonError('Invalid action. Must be "approve" or "reject".', 400);
    }

    const item = await prisma.queueItem.findUnique({ where: { id: params.id } });
    if (!item || item.userId !== auth.userId) {
      return jsonError('Queue item not found', 404);
    }

    if (item.status !== 'pending_confirmation') {
      return jsonError(`Item is not pending confirmation (current: ${item.status})`, 400);
    }

    if (action === 'approve') {
      const updated = await prisma.queueItem.update({
        where: { id: params.id },
        data: { status: 'ready' },
      });

      pushQueueChanged(auth.userId, {
        changeType: 'status_changed',
        itemId: params.id,
        itemTitle: item.title,
        newStatus: 'ready',
      });

      await logActivity({ userId: auth.userId, action: 'queue_confirmed', actor: 'api', summary: `Approved task: ${item.title}` });

      return jsonSuccess({ ...updated, message: `"${item.title}" approved and added to queue.` });
    } else {
      await prisma.queueItem.delete({ where: { id: params.id } });

      pushQueueChanged(auth.userId, {
        changeType: 'removed',
        itemId: params.id,
        itemTitle: item.title,
        newStatus: 'rejected',
      });

      await logActivity({ userId: auth.userId, action: 'queue_rejected', actor: 'api', summary: `Rejected task: ${item.title}` });

      return jsonSuccess({ message: `"${item.title}" rejected and removed.` });
    }
  } catch (error) {
    return jsonError('Failed to confirm queue item', 500);
  }
}
