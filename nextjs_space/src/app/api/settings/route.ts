export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { onEnterCoSMode } from '@/lib/cos-sequential-dispatch';
import { pushWake, pushQueueChanged } from '@/lib/webhook-push';

const updateModeSchema = z.object({
  mode: z.enum(['cockpit', 'chief_of_staff']),
});

const apiKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic']),
  apiKey: z.string().min(1),
  label: z.string().optional(),
});

// GET: Fetch user settings and API keys
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, mode: true, role: true, hasSeenWalkthrough: true },
  });

  const apiKeys = await prisma.agentApiKey.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      label: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: { user, apiKeys },
  });
}

// PUT: Update settings
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const body = await request.json();

  // Update mode
  if (body.mode) {
    const result = updateModeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid mode' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { mode: result.data.mode },
    });

    // DEP-001: Mode switch logic
    if (result.data.mode === 'chief_of_staff') {
      // DEP-008: wake the execution agent
      const queueSnapshot = await prisma.queueItem.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      });
      const snapshot = {
        ready: queueSnapshot.find((g: any) => g.status === 'ready')?._count || 0,
        inProgress: queueSnapshot.find((g: any) => g.status === 'in_progress')?._count || 0,
        blocked: queueSnapshot.find((g: any) => g.status === 'blocked')?._count || 0,
      };

      pushWake(userId, {
        reason: 'Mode switched to Chief of Staff',
        priority: 'normal',
        queueSnapshot: snapshot,
      });

      // Auto-dispatch if nothing is in_progress
      const dispatchResult = await onEnterCoSMode(userId);
      if (dispatchResult.dispatched) {
        pushQueueChanged(userId, {
          changeType: 'status_changed',
          itemId: dispatchResult.item.id,
          itemTitle: dispatchResult.item.title,
          newStatus: 'in_progress',
        });

        return NextResponse.json({
          success: true,
          message: 'Mode updated to Chief of Staff. Auto-dispatched next item.',
          autoDispatched: dispatchResult.item,
        });
      }
    }

    // DEP-004: When returning to cockpit, generate briefing summary
    if (result.data.mode === 'cockpit') {
      const completedToday = await prisma.queueItem.count({
        where: { userId, status: 'done_today' },
      });
      const stillReady = await prisma.queueItem.count({
        where: { userId, status: 'ready' },
      });
      const blocked = await prisma.queueItem.count({
        where: { userId, status: 'blocked' },
      });

      return NextResponse.json({
        success: true,
        briefing: {
          completedToday,
          stillReady,
          blocked,
          message: `Welcome back. ${completedToday} task${completedToday !== 1 ? 's' : ''} completed while in CoS mode. ${blocked > 0 ? `${blocked} item${blocked !== 1 ? 's' : ''} blocked and need${blocked === 1 ? 's' : ''} attention.` : 'No blockers.'} ${stillReady} item${stillReady !== 1 ? 's' : ''} still in queue.`,
        },
      });
    }
  }

  // Update walkthrough status
  if (typeof body.hasSeenWalkthrough === 'boolean') {
    await prisma.user.update({
      where: { id: userId },
      data: { hasSeenWalkthrough: body.hasSeenWalkthrough },
    });
  }

  return NextResponse.json({ success: true });
}

// POST: Add API key
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const result = apiKeySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const userId = (session.user as any).id;

  const apiKey = await prisma.agentApiKey.create({
    data: {
      provider: result.data.provider,
      apiKey: result.data.apiKey,
      label: result.data.label,
      user: { connect: { id: userId } },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: apiKey.id,
      provider: apiKey.provider,
      label: apiKey.label,
    },
  });
}
