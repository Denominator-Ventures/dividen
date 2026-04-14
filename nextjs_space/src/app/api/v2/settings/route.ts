import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';
import { onEnterCoSMode } from '@/lib/cos-sequential-dispatch';
import { pushWake, pushQueueChanged } from '@/lib/webhook-push';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v2/settings — Read user settings (mode, queue preferences)
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request, 'queue');
  if (isAuthError(auth)) return auth;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        mode: true,
        queueAutoApprove: true,
        diviName: true,
        goalsEnabled: true,
        hasCompletedOnboarding: true,
        onboardingPhase: true,
      },
    });

    if (!user) return jsonError('User not found', 404);

    return jsonSuccess({
      mode: user.mode,
      queueAutoApprove: user.queueAutoApprove,
      diviName: user.diviName,
      goalsEnabled: user.goalsEnabled,
      onboardingComplete: user.hasCompletedOnboarding,
      onboardingPhase: user.onboardingPhase,
    });
  } catch (error) {
    return jsonError('Failed to fetch settings', 500);
  }
}

/**
 * PATCH /api/v2/settings — Update user settings
 * Body: { mode?: 'cockpit' | 'chief_of_staff', queueAutoApprove?: boolean }
 */
export async function PATCH(request: NextRequest) {
  const auth = await authenticateAgent(request, 'queue');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const updates: Record<string, any> = {};
    let cosDispatchResult = null;

    // Mode switch
    if (body.mode && ['cockpit', 'chief_of_staff'].includes(body.mode)) {
      updates.mode = body.mode;
    }

    // Queue auto-approve toggle
    if (typeof body.queueAutoApprove === 'boolean') {
      updates.queueAutoApprove = body.queueAutoApprove;
    }

    if (Object.keys(updates).length === 0) {
      return jsonError('No valid fields to update. Supported: mode, queueAutoApprove', 400);
    }

    await prisma.user.update({
      where: { id: auth.userId },
      data: updates,
    });

    // If switching to CoS mode, auto-dispatch
    if (updates.mode === 'chief_of_staff') {
      const queueSnapshot = await prisma.queueItem.groupBy({
        by: ['status'],
        where: { userId: auth.userId },
        _count: true,
      });
      const snapshot = {
        ready: queueSnapshot.find((g: any) => g.status === 'ready')?._count || 0,
        inProgress: queueSnapshot.find((g: any) => g.status === 'in_progress')?._count || 0,
        blocked: queueSnapshot.find((g: any) => g.status === 'blocked')?._count || 0,
      };

      pushWake(auth.userId, {
        reason: 'Mode switched to Chief of Staff via API',
        priority: 'normal',
        queueSnapshot: snapshot,
      });

      const dispatchResult = await onEnterCoSMode(auth.userId);
      if (dispatchResult.dispatched) {
        cosDispatchResult = dispatchResult.item;
        pushQueueChanged(auth.userId, {
          changeType: 'status_changed',
          itemId: dispatchResult.item.id,
          itemTitle: dispatchResult.item.title,
          newStatus: 'in_progress',
        });
      }
    }

    // If switching to cockpit, return briefing
    if (updates.mode === 'cockpit') {
      const [completedToday, stillReady, blocked] = await Promise.all([
        prisma.queueItem.count({ where: { userId: auth.userId, status: 'done_today' } }),
        prisma.queueItem.count({ where: { userId: auth.userId, status: 'ready' } }),
        prisma.queueItem.count({ where: { userId: auth.userId, status: 'blocked' } }),
      ]);

      return jsonSuccess({
        ...updates,
        briefing: {
          completedToday,
          stillReady,
          blocked,
          message: `${completedToday} task${completedToday !== 1 ? 's' : ''} completed. ${blocked > 0 ? `${blocked} blocked.` : 'No blockers.'} ${stillReady} still in queue.`,
        },
      });
    }

    return jsonSuccess({
      ...updates,
      ...(cosDispatchResult ? { autoDispatched: cosDispatchResult } : {}),
    });
  } catch (error) {
    return jsonError('Failed to update settings', 500);
  }
}
