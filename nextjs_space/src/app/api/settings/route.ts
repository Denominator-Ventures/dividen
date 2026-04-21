export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { onEnterCoSMode } from '@/lib/cos-sequential-dispatch';
import { pushWake, pushQueueChanged } from '@/lib/webhook-push';
import { logActivity } from '@/lib/activity';
import { withTelemetry } from '@/lib/telemetry';

const updateModeSchema = z.object({
  mode: z.enum(['cockpit', 'chief_of_staff']),
});

const apiKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic']),
  apiKey: z.string().min(1),
  label: z.string().optional(),
});

// GET: Fetch user settings and API keys
async function _GET() {
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
    select: { id: true, name: true, email: true, username: true, mode: true, role: true, hasSeenWalkthrough: true, hasCompletedOnboarding: true, onboardingPhase: true, diviName: true, workingStyle: true, triageSettings: true, goalsEnabled: true, profilePhotoUrl: true, queueAutoApprove: true },
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
async function _PUT(request: NextRequest) {
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

    logActivity({ userId, action: 'settings_updated', summary: `Switched mode to ${result.data.mode === 'chief_of_staff' ? 'Chief of Staff' : 'Cockpit'}`, actor: 'user', metadata: { setting: 'mode', value: result.data.mode } }).catch(() => {});

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

  // Update onboarding status
  if (typeof body.hasCompletedOnboarding === 'boolean' || typeof body.onboardingPhase === 'number') {
    const onboardingData: any = {};
    if (typeof body.hasCompletedOnboarding === 'boolean') onboardingData.hasCompletedOnboarding = body.hasCompletedOnboarding;
    if (typeof body.onboardingPhase === 'number') onboardingData.onboardingPhase = body.onboardingPhase;
    await prisma.user.update({
      where: { id: userId },
      data: onboardingData,
    });
    if (body.hasCompletedOnboarding) {
      logActivity({ userId, action: 'onboarding_completed', summary: 'Completed onboarding', actor: 'system' }).catch(() => {});
    } else if (typeof body.onboardingPhase === 'number') {
      logActivity({ userId, action: 'onboarding_progress', summary: `Onboarding advanced to phase ${body.onboardingPhase}`, actor: 'system', metadata: { phase: body.onboardingPhase } }).catch(() => {});
    }
  }

  // Update username
  if (typeof body.username === 'string') {
    const clean = body.username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (clean.length > 0 && clean.length <= 30) {
      // Check uniqueness
      const existing = await prisma.user.findFirst({ where: { username: clean, NOT: { id: userId } } });
      if (existing) {
        return NextResponse.json({ success: false, error: 'Username already taken' }, { status: 409 });
      }
      await prisma.user.update({ where: { id: userId }, data: { username: clean } });
    } else if (clean.length === 0) {
      await prisma.user.update({ where: { id: userId }, data: { username: null } });
    }
  }

  // Update queue auto-approve setting
  if (typeof body.queueAutoApprove === 'boolean') {
    await prisma.user.update({
      where: { id: userId },
      data: { queueAutoApprove: body.queueAutoApprove },
    });
  }

  // Update Divi personalization settings
  if (body.diviSettings) {
    const ds = body.diviSettings;
    const updateData: Record<string, any> = {};
    if (typeof ds.diviName === 'string') updateData.diviName = ds.diviName.trim() || null;
    if (ds.workingStyle && typeof ds.workingStyle === 'object') updateData.workingStyle = ds.workingStyle;
    if (ds.triageSettings && typeof ds.triageSettings === 'object') updateData.triageSettings = ds.triageSettings;
    if (typeof ds.goalsEnabled === 'boolean') updateData.goalsEnabled = ds.goalsEnabled;

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
      const settingNames = Object.keys(updateData).join(', ');
      logActivity({ userId, action: 'settings_updated', summary: `Updated settings: ${settingNames}`, actor: 'user', metadata: { settings: Object.keys(updateData) } }).catch(() => {});
    }
  }

  return NextResponse.json({ success: true });
}

// POST: Add API key (upsert — deactivates old keys for same provider first)
async function _POST(request: NextRequest) {
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

  // Deactivate any existing keys for this provider (same as onboarding flow)
  await prisma.agentApiKey.updateMany({
    where: { userId, provider: result.data.provider },
    data: { isActive: false },
  });

  const apiKey = await prisma.agentApiKey.create({
    data: {
      provider: result.data.provider,
      apiKey: result.data.apiKey,
      label: result.data.label,
      isActive: true,
      user: { connect: { id: userId } },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: apiKey.id,
      provider: apiKey.provider,
      label: apiKey.label,
      isActive: true,
    },
  });
}

// DELETE: Remove an API key
async function _DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get('id');

  if (!keyId) {
    return NextResponse.json(
      { success: false, error: 'Key ID is required' },
      { status: 400 }
    );
  }

  // Only delete keys belonging to this user
  await prisma.agentApiKey.deleteMany({
    where: { id: keyId, userId },
  });

  return NextResponse.json({ success: true });
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
export const PUT = withTelemetry(_PUT);
export const DELETE = withTelemetry(_DELETE);
