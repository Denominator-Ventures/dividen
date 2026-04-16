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
    const {
      toUserEmail,
      action,
      summary,
      fromUserName,
      fromUserEmail,
      metadata,
      priority = 'normal',
      createQueueItem = true,
    } = body;

    if (!toUserEmail || !action || !summary) {
      return NextResponse.json({ error: 'toUserEmail, action, and summary are required' }, { status: 400 });
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

    const fromLabel = fromUserName || fromUserEmail || connection.peerUserName || connection.peerUserEmail || 'Remote instance';
    const instanceLabel = connection.peerInstanceUrl || 'unknown instance';

    // Create ActivityLog entry (shows in notification bell feed)
    await logActivity({
      userId: localUser.id,
      action: `federation_${action}`,
      summary: `🌐 [${instanceLabel}] ${fromLabel}: ${summary}`,
      metadata: {
        ...(typeof metadata === 'object' && metadata ? metadata : {}),
        federationSource: connection.peerInstanceUrl,
        connectionId: connection.id,
        fromUserEmail: fromUserEmail || connection.peerUserEmail,
      },
    });

    // Optionally create a QueueItem (shows in queue panel)
    let queueItemId: string | null = null;
    if (createQueueItem) {
      const qi = await prisma.queueItem.create({
        data: {
          userId: localUser.id,
          type: 'notification',
          title: `🌐 ${fromLabel}: ${action.replace(/_/g, ' ')}`,
          description: summary,
          status: 'open',
          priority,
          metadata: JSON.stringify({
            federationSource: connection.peerInstanceUrl,
            connectionId: connection.id,
            action,
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
    });
  } catch (error: any) {
    console.error('POST /api/federation/notifications error:', error);
    return NextResponse.json({ error: error.message || 'Federation notification failed' }, { status: 500 });
  }
}
