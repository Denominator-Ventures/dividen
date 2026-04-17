export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

// ─── Ambient Gate Helpers (FVP Build 522 §5 alignment) ────────────────────────
// Decide whether an inbound ambient relay should be ingested or silently filtered
// based on the recipient's UserProfile preferences.

type AmbientGateResult = { allow: true } | { allow: false; reason: string };

function parseJsonSafe<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function isWithinQuietHours(quietHours: any): boolean {
  if (!quietHours || !quietHours.start || !quietHours.end) return false;
  try {
    const tz = quietHours.timezone || 'UTC';
    const nowInTz = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
    const hours = nowInTz.getHours();
    const minutes = nowInTz.getMinutes();
    const nowMinutes = hours * 60 + minutes;
    const [sh, sm] = String(quietHours.start).split(':').map(Number);
    const [eh, em] = String(quietHours.end).split(':').map(Number);
    const startMinutes = sh * 60 + (sm || 0);
    const endMinutes = eh * 60 + (em || 0);
    if (startMinutes < endMinutes) {
      // Same-day window (e.g. 13:00–17:00)
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    } else {
      // Overnight window (e.g. 22:00–08:00)
      return nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }
  } catch { return false; }
}

async function checkAmbientInboundGate(
  userId: string,
  payload: any,
): Promise<AmbientGateResult> {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) return { allow: true }; // No prefs set → allow by default

  // Mode gate
  if (profile.relayMode === 'off') {
    return { allow: false, reason: 'relay_mode_off' };
  }
  if (profile.relayMode === 'minimal') {
    // Minimal mode: block all ambient
    return { allow: false, reason: 'relay_mode_minimal_blocks_ambient' };
  }

  if (profile.allowAmbientInbound === false) {
    return { allow: false, reason: 'ambient_inbound_disabled' };
  }

  // Topic filter gate
  const topic = payload?.topic || payload?._topic || null;
  if (topic) {
    const filters = parseJsonSafe<string[]>(profile.relayTopicFilters, []);
    if (filters.some(f => String(f).toLowerCase() === String(topic).toLowerCase())) {
      return { allow: false, reason: `topic_filtered:${topic}` };
    }
  }

  // Quiet hours gate
  const quietHours = parseJsonSafe<any>(profile.relayQuietHours, null);
  if (isWithinQuietHours(quietHours)) {
    return { allow: false, reason: 'quiet_hours' };
  }

  return { allow: true };
}

// POST /api/federation/relay — receive a relay from a remote instance
export async function POST(req: NextRequest) {
  try {
    const federationToken = req.headers.get('x-federation-token');
    if (!federationToken) {
      return NextResponse.json({ error: 'Missing federation token' }, { status: 401 });
    }

    // Check federation config
    const fedConfig = await prisma.federationConfig.findFirst();
    if (!fedConfig || !fedConfig.allowInbound) {
      return NextResponse.json({ error: 'Inbound federation disabled' }, { status: 403 });
    }

    const body = await req.json();
    const {
      connectionId: remoteConnectionId,
      relayId: remoteRelayId,
      fromUserEmail,
      fromUserName,
      toUserEmail,
      type,
      intent,
      subject,
      payload,
      priority,
      dueDate,
    } = body;

    // Find the local connection by federation token
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

    // ── Idempotency: FVP Build 522 §4 — dedup on peerRelayId + connectionId ──
    if (remoteRelayId) {
      const existing = await prisma.agentRelay.findFirst({
        where: { peerRelayId: remoteRelayId, connectionId: connection.id },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ success: true, duplicate: true, relayId: existing.id });
      }
    }

    // Parse payload once — it may arrive as string or object
    const parsedPayload: any = typeof payload === 'string'
      ? parseJsonSafe<any>(payload, {})
      : (payload || {});

    // Ambient detection: FVP signals via payload._ambient === true
    const isAmbient = parsedPayload?._ambient === true
      || parsedPayload?.ambient === true
      || (intent === 'share_update' && priority === 'low');

    // Task-intent detection: relay should land on Kanban board
    const isTaskIntent = ['assign_task', 'delegate', 'schedule', 'request_approval'].includes(String(intent || ''));

    // Find the local user
    const localUser = await prisma.user.findUnique({
      where: { email: toUserEmail },
    });

    // Resolve the target user (local match or fallback to connection requester)
    const targetUserId = localUser?.id || connection.requesterId;

    // ── Ambient gating: check recipient preferences before ingesting ──
    if (isAmbient) {
      const gate = await checkAmbientInboundGate(targetUserId, parsedPayload);
      if (gate.allow === false) {
        // FVP Build 522 §5: silent filter — return 200 but no record created
        return NextResponse.json({ ok: true, filtered: true, reason: gate.reason });
      }
    }

    // ── Create the AgentRelay record ──
    const relay = await prisma.agentRelay.create({
      data: {
        connectionId: connection.id,
        fromUserId: connection.requesterId, // Sender placeholder (remote user — we don't have a local row)
        toUserId: targetUserId,
        direction: 'inbound',
        type: type || 'request',
        intent: intent || 'custom',
        subject: subject || 'Federated relay',
        payload: parsedPayload ? JSON.stringify(parsedPayload) : null,
        status: 'delivered',
        priority: priority || (isAmbient ? 'low' : 'normal'),
        dueDate: dueDate ? new Date(dueDate) : null,
        peerRelayId: remoteRelayId || null,
        peerInstanceUrl: connection.peerInstanceUrl,
      },
    });

    // ── FVP Build 522 §2 behavior #2: task relays land on Kanban board ──
    let kanbanCardId: string | null = null;
    if (isTaskIntent && !isAmbient) {
      try {
        // Determine the highest `order` in the intake ("leads") column so the new
        // card sits at the top of the stack.
        const latestInLeads = await prisma.kanbanCard.findFirst({
          where: { userId: targetUserId, status: 'leads' },
          orderBy: { order: 'desc' },
          select: { order: true },
        });
        const nextOrder = (latestInLeads?.order ?? -1) + 1;

        const description = parsedPayload?.description
          || parsedPayload?.body
          || parsedPayload?.message
          || `From ${fromUserName || fromUserEmail || 'peer'} via ${connection.peerInstanceUrl}`;

        const card = await prisma.kanbanCard.create({
          data: {
            title: subject || 'Federated task',
            description: String(description).substring(0, 2000),
            status: 'leads', // Intake stage
            priority: priority === 'urgent' ? 'urgent' : priority === 'low' ? 'low' : 'medium',
            assignee: 'human',
            order: nextOrder,
            userId: targetUserId,
            dueDate: dueDate ? new Date(dueDate) : null,
            sourceRelayId: relay.id,
            originUserId: null, // Remote user — no local row to link
          },
        });
        kanbanCardId = card.id;

        // Link the relay → card so both surfaces show the same thread
        await prisma.agentRelay.update({
          where: { id: relay.id },
          data: { cardId: card.id },
        });
      } catch (cardErr: any) {
        console.error('[federation/relay] Failed to create Kanban card for task intent:', cardErr);
        // Non-fatal — relay is still recorded and surfaced via comms below
      }
    }

    // ── Surface to CommsTab ──
    // Ambient relays: low priority, no loud prefix — they are meant to be woven
    // into the next Divi message rather than create a notification.
    // Task/normal relays: standard 🌐 prefix so the user knows a peer reached in.
    const commsPrefix = isAmbient ? '🌊' : '🌐';
    const commsPriority = isAmbient ? 'low' : (priority || 'normal');
    const commsState = isAmbient ? 'read' : 'new'; // ambient auto-read so it doesn't beep

    await prisma.commsMessage.create({
      data: {
        sender: 'system',
        content: `${commsPrefix} Relay from ${fromUserName || fromUserEmail} (${connection.peerInstanceUrl}): ${subject}`,
        state: commsState,
        priority: commsPriority,
        userId: targetUserId,
        linkedCardId: kanbanCardId, // Link to created Kanban card if any
        metadata: JSON.stringify({
          type: 'federated_relay',
          relayId: relay.id,
          ambient: isAmbient,
          taskIntent: isTaskIntent,
          cardId: kanbanCardId,
        }),
      },
    });

    await logActivity({
      userId: targetUserId,
      action: 'federation_relay_received',
      summary: `${commsPrefix} Relay received from ${fromUserName || fromUserEmail}: ${subject || 'No subject'}`,
      metadata: {
        relayId: relay.id,
        connectionId: connection.id,
        type,
        intent,
        ambient: isAmbient,
        cardId: kanbanCardId,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      relayId: relay.id,
      ambient: isAmbient,
      cardId: kanbanCardId,
      fallback: !localUser, // Tell FVP we couldn't route to the specified email
    });
  } catch (error: any) {
    console.error('POST /api/federation/relay error:', error);
    return NextResponse.json({ error: error.message || 'Federation relay failed' }, { status: 500 });
  }
}
