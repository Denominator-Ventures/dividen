export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

/**
 * POST /api/cron/sweep
 *
 * Federation & lifecycle reconciliation sweep — catches events Divi may have missed.
 * Runs hourly via scheduled daemon, scans ALL users and ALL federated connections.
 *
 * Auth: Bearer ADMIN_PASSWORD or x-cron-secret header.
 *
 * Checks:
 *   1. Stale pending outbound relays (not pushed after 30 min) → retry push
 *   2. Delivered relays with no ack after 24h → surface reminder to sender
 *   3. Orphaned pending project invites (>48h) → reminder to invitee
 *   4. Stale queue items (ready >24h) → surface reminder
 *   5. Unacked relay completions (completed/declined with peerRelayId, no ack sent) → retry ack
 *   6. Federation connection health (active connections with no relay activity in 7d) → log
 *   7. Expired invites (pending >7d) → auto-expire
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = req.headers.get('x-cron-secret');
    const adminPass = process.env.ADMIN_PASSWORD;

    const isAuthed =
      (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === adminPass) ||
      (cronSecret && cronSecret === adminPass);

    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const fixes: string[] = [];
    const warnings: string[] = [];
    let totalFixed = 0;

    // ══════════════════════════════════════════════════════════════════════
    // 1. STALE PENDING OUTBOUND RELAYS — should have been pushed
    // ══════════════════════════════════════════════════════════════════════
    const stalePendingRelays = await prisma.agentRelay.findMany({
      where: {
        direction: 'outbound',
        status: 'pending',
        createdAt: { lt: thirtyMinAgo },
        connection: { isFederated: true, status: 'active' },
      },
      select: {
        id: true,
        fromUserId: true,
        subject: true,
        connectionId: true,
        connection: {
          select: { peerInstanceUrl: true, federationToken: true, hmacEnabled: true, peerUserEmail: true },
        },
      },
      take: 50,
    });

    if (stalePendingRelays.length > 0) {
      const { pushRelayToFederatedInstance } = await import('@/lib/federation-push');

      for (const relay of stalePendingRelays) {
        try {
          // Parse payload to reconstruct push params
          let payloadObj: any = {};
          try {
            const fullRelay = await prisma.agentRelay.findUnique({ where: { id: relay.id } });
            if (fullRelay?.payload) payloadObj = JSON.parse(fullRelay.payload);
          } catch {}

          const fromUser = await prisma.user.findUnique({
            where: { id: relay.fromUserId },
            select: { name: true, email: true },
          });

          await pushRelayToFederatedInstance(relay.connectionId, {
            relayId: relay.id,
            fromUserEmail: fromUser?.email || '',
            fromUserName: fromUser?.name || '',
            fromUserId: relay.fromUserId,
            toUserEmail: relay.connection.peerUserEmail || '',
            type: 'request',
            intent: payloadObj?.intent || 'custom',
            subject: relay.subject,
            payload: payloadObj,
          });

          fixes.push(`Retried push for stale relay ${relay.id.slice(-6)}: "${relay.subject}"`);
          totalFixed++;
        } catch (err: any) {
          warnings.push(`Failed retry for relay ${relay.id.slice(-6)}: ${err?.message}`);
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // 2. DELIVERED RELAYS WITH NO ACK AFTER 24H — remind sender
    // ══════════════════════════════════════════════════════════════════════
    const unansweredRelays = await prisma.agentRelay.findMany({
      where: {
        direction: 'outbound',
        status: 'delivered',
        createdAt: { lt: twentyFourHoursAgo },
        resolvedAt: null,
        connection: { isFederated: true },
      },
      select: {
        id: true,
        fromUserId: true,
        subject: true,
        createdAt: true,
        connection: { select: { peerUserName: true, peerUserEmail: true, peerInstanceUrl: true } },
      },
      take: 50,
    });

    for (const relay of unansweredRelays) {
      // Check if we already reminded for this relay in the last 24h
      const existingReminder = await prisma.commsMessage.findFirst({
        where: {
          userId: relay.fromUserId,
          metadata: { contains: relay.id },
          createdAt: { gt: twentyFourHoursAgo },
          content: { contains: 'still waiting' },
        },
      });
      if (existingReminder) continue;

      const peerName = relay.connection.peerUserName || relay.connection.peerUserEmail || 'peer';
      const hoursAgo = Math.round((now.getTime() - relay.createdAt.getTime()) / (60 * 60 * 1000));

      await prisma.commsMessage.create({
        data: {
          sender: 'system',
          content: `⏰ Sweep: still waiting on ${peerName} for "${relay.subject}" (sent ${hoursAgo}h ago). Want me to follow up?`,
          state: 'new',
          priority: 'low',
          userId: relay.fromUserId,
          metadata: JSON.stringify({
            type: 'sweep_reminder',
            subtype: 'unanswered_relay',
            relayId: relay.id,
            peerName,
            hoursAgo,
          }),
        },
      });
      fixes.push(`Reminded ${relay.fromUserId.slice(-6)} about unanswered relay to ${peerName}: "${relay.subject}"`);
      totalFixed++;
    }

    // ══════════════════════════════════════════════════════════════════════
    // 3. ORPHANED PENDING PROJECT INVITES (>48h)
    // ══════════════════════════════════════════════════════════════════════
    const staleInvites = await prisma.projectInvite.findMany({
      where: {
        status: 'pending',
        createdAt: { lt: fortyEightHoursAgo },
      },
      select: {
        id: true,
        inviterId: true,
        inviteeId: true,
        connectionId: true,
        project: { select: { name: true } },
        createdAt: true,
      },
      take: 50,
    });

    for (const invite of staleInvites) {
      // Remind the inviter
      const existingReminder = await prisma.commsMessage.findFirst({
        where: {
          userId: invite.inviterId,
          metadata: { contains: invite.id },
          createdAt: { gt: twentyFourHoursAgo },
          content: { contains: 'pending invite' },
        },
      });
      if (existingReminder) continue;

      const daysAgo = Math.round((now.getTime() - invite.createdAt.getTime()) / (24 * 60 * 60 * 1000));
      const targetType = invite.connectionId ? 'federated peer' : 'local user';

      await prisma.commsMessage.create({
        data: {
          sender: 'system',
          content: `⏰ Sweep: pending invite to "${invite.project.name}" for ${targetType} has been waiting ${daysAgo}d. Follow up or expire it?`,
          state: 'new',
          priority: 'low',
          userId: invite.inviterId,
          metadata: JSON.stringify({
            type: 'sweep_reminder',
            subtype: 'stale_invite',
            inviteId: invite.id,
            projectName: invite.project.name,
            daysAgo,
          }),
        },
      });
      fixes.push(`Reminded about stale invite to "${invite.project.name}" (${daysAgo}d)`);
      totalFixed++;
    }

    // ══════════════════════════════════════════════════════════════════════
    // 4. STALE QUEUE ITEMS (ready >24h, not done)
    // ══════════════════════════════════════════════════════════════════════
    const staleQueueItems = await prisma.queueItem.findMany({
      where: {
        status: { in: ['ready', 'in_progress'] },
        createdAt: { lt: twentyFourHoursAgo },
      },
      select: {
        id: true,
        userId: true,
        title: true,
        status: true,
        createdAt: true,
        metadata: true,
      },
      take: 100,
    });

    // Group by user to batch reminders
    const staleByUser: Record<string, typeof staleQueueItems> = {};
    for (const qi of staleQueueItems) {
      if (!qi.userId) continue;
      if (!staleByUser[qi.userId]) staleByUser[qi.userId] = [];
      staleByUser[qi.userId].push(qi);
    }

    for (const [userId, items] of Object.entries(staleByUser)) {
      // Check if we already sent a stale-queue reminder in the last 24h
      const existingReminder = await prisma.commsMessage.findFirst({
        where: {
          userId,
          createdAt: { gt: twentyFourHoursAgo },
          content: { contains: 'stale queue' },
        },
      });
      if (existingReminder) continue;

      const itemSummary = items.slice(0, 5).map(i => `• "${i.title}"`).join('\n');
      const more = items.length > 5 ? `\n...and ${items.length - 5} more` : '';

      await prisma.commsMessage.create({
        data: {
          sender: 'system',
          content: `⏰ Sweep: ${items.length} stale queue item${items.length > 1 ? 's' : ''} sitting >24h:\n${itemSummary}${more}`,
          state: 'new',
          priority: 'low',
          userId,
          metadata: JSON.stringify({
            type: 'sweep_reminder',
            subtype: 'stale_queue',
            count: items.length,
            itemIds: items.map(i => i.id),
          }),
        },
      });
      fixes.push(`Reminded ${userId.slice(-6)} about ${items.length} stale queue items`);
      totalFixed++;
    }

    // ══════════════════════════════════════════════════════════════════════
    // 5. UNACKED RELAY COMPLETIONS — we completed but never acked back
    // ══════════════════════════════════════════════════════════════════════
    const unackedCompletions = await prisma.agentRelay.findMany({
      where: {
        direction: 'inbound',
        status: { in: ['completed', 'declined'] },
        peerRelayId: { not: null },
        peerInstanceUrl: { not: null },
        // Only look at recently resolved ones to avoid re-acking ancient relays
        resolvedAt: { gt: sevenDaysAgo },
        connection: { isFederated: true, status: 'active' },
      },
      select: {
        id: true,
        peerRelayId: true,
        peerInstanceUrl: true,
        connectionId: true,
        subject: true,
        status: true,
        responsePayload: true,
        teamId: true,
        projectId: true,
      },
      take: 50,
    });

    if (unackedCompletions.length > 0) {
      const { pushRelayAckToFederatedInstance } = await import('@/lib/federation-push');

      for (const relay of unackedCompletions) {
        // Heuristic: check if the peer already has our ack by looking for a comms message
        // that confirms the ack was sent. If so, skip.
        // Since pushRelayAckToFederatedInstance is fire-and-forget, we don't have a clean
        // "ack_sent" field. Re-sending is safe (peer should be idempotent), but we limit
        // to one retry by checking activity log.
        const ackLogged = await prisma.activityLog.findFirst({
          where: {
            action: { in: ['federation_relay_completed', 'relay_response'] },
            metadata: { contains: relay.id },
          },
        });
        // If activity exists with our relay ID, the ack was likely already sent via
        // relay-ack handler or action-tags. Skip unless it's very recent (last hour).
        if (ackLogged) continue;

        try {
          await pushRelayAckToFederatedInstance({
            id: relay.id,
            peerRelayId: relay.peerRelayId,
            peerInstanceUrl: relay.peerInstanceUrl,
            connectionId: relay.connectionId,
            subject: relay.subject,
            status: relay.status,
            responsePayload: relay.responsePayload,
            teamId: relay.teamId,
            projectId: relay.projectId,
          });
          fixes.push(`Retry ack-back for relay ${relay.id.slice(-6)} → ${relay.peerInstanceUrl}`);
          totalFixed++;
        } catch (err: any) {
          warnings.push(`Failed ack retry for ${relay.id.slice(-6)}: ${err?.message}`);
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // 6. FEDERATION CONNECTION HEALTH — dormant connections
    // ══════════════════════════════════════════════════════════════════════
    const activeConnections = await prisma.connection.findMany({
      where: { isFederated: true, status: 'active' },
      select: {
        id: true,
        requesterId: true,
        peerUserName: true,
        peerUserEmail: true,
        peerInstanceUrl: true,
        updatedAt: true,
      },
    });

    for (const conn of activeConnections) {
      // Check for any relay activity in the last 7 days
      const recentRelay = await prisma.agentRelay.findFirst({
        where: {
          connectionId: conn.id,
          createdAt: { gt: sevenDaysAgo },
        },
        select: { id: true },
      });

      if (!recentRelay) {
        const peerLabel = conn.peerUserName || conn.peerUserEmail || conn.peerInstanceUrl || 'unknown peer';
        warnings.push(`Dormant connection: ${peerLabel} (${conn.id.slice(-6)}) — no relay activity in 7d`);

        await logActivity({
          userId: conn.requesterId,
          action: 'sweep_dormant_connection',
          actor: 'system',
          summary: `🔇 Federation connection to ${peerLabel} has been dormant for 7+ days`,
          metadata: { connectionId: conn.id, peerInstanceUrl: conn.peerInstanceUrl },
        }).catch(() => {});
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // 7. AUTO-EXPIRE OLD INVITES (>7d pending)
    // ══════════════════════════════════════════════════════════════════════
    const expiredInvites = await prisma.projectInvite.updateMany({
      where: {
        status: 'pending',
        createdAt: { lt: sevenDaysAgo },
      },
      data: { status: 'expired' },
    });

    if (expiredInvites.count > 0) {
      fixes.push(`Auto-expired ${expiredInvites.count} project invite${expiredInvites.count > 1 ? 's' : ''} (>7d pending)`);
      totalFixed += expiredInvites.count;
    }

    // ══════════════════════════════════════════════════════════════════════
    // SUMMARY LOG
    // ══════════════════════════════════════════════════════════════════════
    const summary = [
      `Stale pending relays: ${stalePendingRelays.length} found, retried`,
      `Unanswered delivered relays (>24h): ${unansweredRelays.length}`,
      `Stale project invites (>48h): ${staleInvites.length}`,
      `Stale queue items (>24h): ${staleQueueItems.length} across ${Object.keys(staleByUser).length} users`,
      `Unacked completions: ${unackedCompletions.length}`,
      `Dormant connections (7d): ${activeConnections.length - activeConnections.filter(() => true).length || warnings.filter(w => w.includes('Dormant')).length}`,
      `Auto-expired invites: ${expiredInvites.count}`,
    ];

    console.log(`[sweep] Reconciliation complete: ${totalFixed} fixes, ${warnings.length} warnings`);

    // Log a single activity entry for the sweep itself (use first admin user)
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } });
    if (adminUser) {
      await logActivity({
        userId: adminUser.id,
        action: 'sweep_reconciliation',
        actor: 'system',
        summary: `🧹 Hourly sweep: ${totalFixed} fix${totalFixed !== 1 ? 'es' : ''}, ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`,
        metadata: { fixes, warnings, summary, timestamp: now.toISOString() },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      totalFixed,
      totalWarnings: warnings.length,
      summary,
      fixes,
      warnings,
    });
  } catch (error: any) {
    console.error('[sweep] Fatal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
