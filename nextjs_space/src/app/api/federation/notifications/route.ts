export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

/**
 * POST /api/federation/notifications
 *
 * Receives notifications from a remote federated instance and creates
 * local ActivityLog + QueueItem entries for the target user.
 *
 * Auth: X-Federation-Token header — must match an active federated connection.
 *
 * Body:
 *   toUserEmail    — required, the local user who should receive the notification
 *   action         — required, notification action type (e.g. "project_update", "member_change", "relay_status")
 *   summary        — required, human-readable notification text
 *   fromUserName   — optional, display name of the remote actor
 *   fromUserEmail  — optional, email of the remote actor
 *   metadata       — optional, arbitrary JSON payload
 *   priority       — optional, "low" | "normal" | "high" | "urgent" (default: "normal")
 *   createQueueItem — optional, boolean — also create a QueueItem (default: true)
 */
export async function POST(req: NextRequest) {
  try {
    const federationToken = req.headers.get('x-federation-token');
    if (!federationToken) {
      return NextResponse.json({ error: 'Missing X-Federation-Token header' }, { status: 401 });
    }

    // Verify federation is enabled
    const fedConfig = await prisma.federationConfig.findFirst();
    if (!fedConfig || !fedConfig.allowInbound) {
      return NextResponse.json({ error: 'Inbound federation disabled' }, { status: 403 });
    }

    // Find the connection by federation token
    const connection = await prisma.connection.findFirst({
      where: {
        isFederated: true,
        federationToken,
        status: 'active',
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'No active federated connection found for this token' }, { status: 404 });
    }

    const body = await req.json();
    // v2.3.2 — Accept BOTH wire shapes:
    //   Legacy (pre-2.3):  { action, summary }
    //   Current (federation-push.ts): { type, title, body }
    const {
      toUserEmail,
      action,
      summary,
      type,
      title,
      body: notifBody,
      fromUserName,
      fromUserEmail,
      metadata,
      priority = 'normal',
      createQueueItem = true,
      teamId: remoteTeamId,
      projectId: remoteProjectId,
    } = body;

    const effectiveAction = action || type;
    const effectiveSummary = summary || notifBody || title;

    if (!toUserEmail || !effectiveAction || !effectiveSummary) {
      return NextResponse.json({ error: 'toUserEmail + (action|type) + (summary|body|title) are required' }, { status: 400 });
    }

    // Resolve local user
    let localUser = await prisma.user.findUnique({ where: { email: toUserEmail } });
    if (!localUser) {
      // Fall back to the connection owner
      localUser = await prisma.user.findUnique({ where: { id: connection.requesterId } });
    }

    if (!localUser) {
      return NextResponse.json({ error: 'Could not resolve a local user for this notification' }, { status: 404 });
    }

    // v2.3.2 — validate scope rows exist locally (advisory; drop if not)
    let scopedTeamId: string | null = null;
    let scopedProjectId: string | null = null;
    if (remoteTeamId) {
      const t = await prisma.team.findUnique({ where: { id: String(remoteTeamId) }, select: { id: true } });
      if (t) scopedTeamId = t.id;
    }
    if (remoteProjectId) {
      const p = await prisma.project.findUnique({ where: { id: String(remoteProjectId) }, select: { id: true, teamId: true } });
      if (p) {
        scopedProjectId = p.id;
        if (p.teamId && !scopedTeamId) scopedTeamId = p.teamId;
      }
    }

    const fromLabel = fromUserName || fromUserEmail || connection.peerUserName || connection.peerUserEmail || 'Remote instance';
    const instanceLabel = connection.peerInstanceUrl || 'unknown instance';

    // Create ActivityLog entry (shows in notification bell feed)
    await logActivity({
      userId: localUser.id,
      action: `federation_${effectiveAction}`,
      summary: `🌐 [${instanceLabel}] ${fromLabel}: ${effectiveSummary}`,
      metadata: {
        ...(typeof metadata === 'object' && metadata ? metadata : {}),
        federationSource: connection.peerInstanceUrl,
        connectionId: connection.id,
        fromUserEmail: fromUserEmail || connection.peerUserEmail,
        // v2.3.2 — scope
        teamId: scopedTeamId,
        projectId: scopedProjectId,
      },
    });

    // Optionally create a QueueItem (shows in queue panel)
    let queueItemId: string | null = null;
    if (createQueueItem) {
      const qi = await prisma.queueItem.create({
        data: {
          userId: localUser.id,
          type: 'notification',
          title: title || `🌐 ${fromLabel}: ${String(effectiveAction).replace(/_/g, ' ')}`,
          description: effectiveSummary,
          status: 'ready',
          priority,
          // v2.3.2 — top-level scope on the queue item
          teamId: scopedTeamId || undefined,
          projectId: scopedProjectId || undefined,
          metadata: JSON.stringify({
            federationSource: connection.peerInstanceUrl,
            connectionId: connection.id,
            action: effectiveAction,
            teamId: scopedTeamId,
            projectId: scopedProjectId,
            ...(typeof metadata === 'object' && metadata ? metadata : {}),
          }),
        },
      });
      queueItemId = qi.id;
    }

    return NextResponse.json({
      success: true,
      userId: localUser.id,
      activityLogged: true,
      queueItemId,
      // v2.3.2 — echo resolved scope
      teamId: scopedTeamId,
      projectId: scopedProjectId,
      scopeDropped: {
        teamId: !!(remoteTeamId && !scopedTeamId),
        projectId: !!(remoteProjectId && !scopedProjectId),
      },
    });
  } catch (error: any) {
    console.error('POST /api/federation/notifications error:', error);
    return NextResponse.json({ error: error.message || 'Federation notification failed' }, { status: 500 });
  }
}
