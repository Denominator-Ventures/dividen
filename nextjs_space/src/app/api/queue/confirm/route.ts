export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { pushQueueChanged } from '@/lib/webhook-push';
import { logActivity } from '@/lib/activity';

/**
 * POST /api/queue/confirm
 * Confirms or rejects a pending_confirmation queue item.
 * Body: { id: string, action: 'approve' | 'reject' }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Missing id or invalid action (approve|reject)' }, { status: 400 });
    }

    // Find the item
    const item = await prisma.queueItem.findUnique({ where: { id } });
    if (!item || item.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    if (item.status !== 'pending_confirmation') {
      return NextResponse.json({ success: false, error: `Item is not pending confirmation (current: ${item.status})` }, { status: 400 });
    }

    if (action === 'approve') {
      // Move to ready
      const updated = await prisma.queueItem.update({
        where: { id },
        data: { status: 'ready' },
      });

      pushQueueChanged(userId, {
        changeType: 'status_changed',
        itemId: id,
        itemTitle: item.title,
        newStatus: 'ready',
      });

      await logActivity({ userId, action: 'queue_confirmed', actor: 'user', summary: `Approved task: ${item.title}` });

      return NextResponse.json({ success: true, data: updated, message: `"${item.title}" approved and added to queue.` });
    } else {
      // Reject — delete the item
      await prisma.queueItem.delete({ where: { id } });

      pushQueueChanged(userId, {
        changeType: 'removed',
        itemId: id,
        itemTitle: item.title,
        newStatus: 'rejected',
      });

      await logActivity({ userId, action: 'queue_rejected', actor: 'user', summary: `Rejected task: ${item.title}` });

      return NextResponse.json({ success: true, message: `"${item.title}" rejected and removed.` });
    }
  } catch (error: any) {
    console.error('[queue/confirm] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
