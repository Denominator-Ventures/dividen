export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

/**
 * POST /api/federation/relay-ack
 * 
 * Receives a completion/response acknowledgment from a remote federated instance.
 * When the receiving Divi completes a task, it pushes back here so the sending Divi
 * can close the loop: advance the queue item, update cards, checklist, and comms.
 * 
 * The sending Divi owns the lifecycle — this endpoint is the completion callback.
 */
export async function POST(req: NextRequest) {
  try {
    const federationToken = req.headers.get('x-federation-token');
    if (!federationToken) {
      return NextResponse.json({ error: 'Missing federation token' }, { status: 401 });
    }

    const fedConfig = await prisma.federationConfig.findFirst();
    if (!fedConfig || !fedConfig.allowInbound) {
      return NextResponse.json({ error: 'Inbound federation disabled' }, { status: 403 });
    }

    // Read raw body for HMAC verification
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const {
      relayId: bodyRelayId,   // Could be their relay ID (FVP convention) or our relay ID (DiviDen convention)
      peerRelayId,            // FVP sends our relay ID here (v2.4.2 compat)
      localRelayId,           // Remote instance's relay ID (informational — DiviDen convention)
      status: rawStatus,      // 'completed' | 'declined' | 'accepted' (FVP sends 'accepted')
      type: ackType,          // e.g. 'project_invite_response' (FVP Build 540+)
      responsePayload,
      subject,
      timestamp,
      metadata,               // FVP includes { inviteId, connectionId, action, respondedAt }
    } = body;

    // v2.4.2 — Cross-instance relay ID resolution:
    // DiviDen convention: relayId = recipient's (our) relay ID
    // FVP convention: relayId = their relay ID, peerRelayId = our relay ID
    // Try peerRelayId first (FVP), then fall back to relayId (DiviDen), then metadata.inviteId
    const relayId = peerRelayId || bodyRelayId || metadata?.inviteId;

    // Normalize status: FVP sends 'accepted', DiviDen uses 'completed'
    const status = rawStatus === 'accepted' ? 'completed' : rawStatus;

    if (!relayId || !status) {
      return NextResponse.json({ error: 'relayId and status are required' }, { status: 400 });
    }

    // Validate the federation token against an active connection
    const connection = await prisma.connection.findFirst({
      where: {
        isFederated: true,
        federationToken,
        status: 'active',
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'No active federated connection for this token' }, { status: 404 });
    }

    // v2.4.0 — HMAC verification (feature-flagged per-connection)
    if (connection.hmacEnabled) {
      const { verifyHmac, HMAC_HEADER } = await import('@/lib/federation-hmac');
      const hmacSig = req.headers.get(HMAC_HEADER);
      if (!hmacSig || !verifyHmac(rawBody, hmacSig, federationToken)) {
        return NextResponse.json({ error: 'HMAC verification failed' }, { status: 401 });
      }
    }

    // Find the local relay — try direct ID lookup first, then by peerRelayId field
    let relay = await prisma.agentRelay.findUnique({ where: { id: relayId } });
    if (!relay && bodyRelayId && bodyRelayId !== relayId) {
      // FVP may have sent their relay ID as bodyRelayId — try looking up by peerRelayId field
      relay = await prisma.agentRelay.findFirst({
        where: { peerRelayId: bodyRelayId, connectionId: connection.id },
      });
    }
    if (!relay) {
      console.warn(`[relay-ack] Relay not found: relayId=${relayId}, bodyRelayId=${bodyRelayId}, peerRelayId=${peerRelayId}`);
      return NextResponse.json({ error: 'Relay not found' }, { status: 404 });
    }

    const isTerminal = status === 'completed' || status === 'declined';
    const statusLabel = status === 'completed' ? '✅ completed' : status === 'declined' ? '❌ declined' : `→ ${status}`;
    const senderUserId = relay.fromUserId;

    // Resolve the target name — who was this relay sent to?
    let targetName = 'remote agent';
    try {
      const toUser = relay.toUserId ? await prisma.user.findUnique({ where: { id: relay.toUserId }, select: { name: true, email: true } }) : null;
      if (toUser?.name) {
        targetName = toUser.name;
      } else if (connection.peerUserName) {
        targetName = connection.peerUserName;
      } else if (connection.peerUserEmail) {
        targetName = connection.peerUserEmail;
      }
    } catch {}

    // ── 1. Update relay status ──
    // Use relay.id (the resolved local record) — may differ from relayId if we matched via peerRelayId
    await prisma.agentRelay.update({
      where: { id: relay.id },
      data: {
        status,
        responsePayload: responsePayload ? (typeof responsePayload === 'string' ? responsePayload : JSON.stringify(responsePayload)) : null,
        resolvedAt: isTerminal ? new Date() : undefined,
      },
    });

    // ── 2. Log activity ──
    await logActivity({
      userId: senderUserId,
      action: 'federation_relay_completed',
      summary: `📡 ${targetName} ${statusLabel} relay: "${relay.subject}"`,
      metadata: {
        relayId: relay.id,
        remoteRelayId: localRelayId || bodyRelayId,
        connectionId: connection.id,
        status,
        targetName,
        peerInstanceUrl: connection.peerInstanceUrl,
      },
    }).catch(() => {});

    // ── 3. Comms message to sender — response received, with target name ──
    const isInviteResponse = ackType === 'project_invite_response';
    const commsContent = isInviteResponse
      ? `📡 ${targetName} ${status === 'completed' ? '✅ accepted' : '❌ declined'} the project invite: "${relay.subject}"`
      : `📡 ${targetName} ${statusLabel} the task: "${relay.subject}"${responsePayload ? `\n\nResponse: ${typeof responsePayload === 'string' ? responsePayload : JSON.stringify(responsePayload)}` : ''}`;

    await prisma.commsMessage.create({
      data: {
        sender: 'divi',
        content: commsContent,
        state: 'new',
        priority: relay.priority || 'normal',
        userId: senderUserId,
        metadata: JSON.stringify({
          type: isInviteResponse ? 'federation_invite_response' : 'federation_relay_completed',
          relayId: relay.id,
          remoteRelayId: localRelayId || bodyRelayId,
          status,
          targetName,
          connectionId: connection.id,
          peerInstanceUrl: connection.peerInstanceUrl,
          ...(isInviteResponse ? { ackType, inviteId: metadata?.inviteId } : {}),
        }),
      },
    });

    // ── 4. Advance queue item → done ──
    if (relay.queueItemId && isTerminal) {
      const queueItem = await prisma.queueItem.findFirst({
        where: { id: relay.queueItemId, userId: senderUserId },
      });

      if (queueItem && queueItem.status !== 'done_today') {
        await prisma.queueItem.update({
          where: { id: queueItem.id },
          data: { status: 'done_today' },
        });

        // Trigger sequential dispatch for next task
        try {
          const { onTaskComplete } = await import('@/lib/cos-sequential-dispatch');
          await onTaskComplete(senderUserId, queueItem.id);
        } catch {}
      }
    }

    // ── 5. Update checklist item (delegation status) ──
    if (isTerminal) {
      try {
        const linkedChecklist = await prisma.checklistItem.findFirst({
          where: { sourceType: 'relay', sourceId: relay.id },
        });
        if (linkedChecklist) {
          const newDelegationStatus = status === 'completed' ? 'completed' : 'declined';
          await prisma.checklistItem.update({
            where: { id: linkedChecklist.id },
            data: {
              delegationStatus: newDelegationStatus,
              completed: status === 'completed',
            },
          });
        }
      } catch {}
    }

    // ── 6. Project invite response — update ProjectInvite record (v2.4.2) ──
    if (ackType === 'project_invite_response' && isTerminal) {
      try {
        // Find the ProjectInvite linked to this relay's connection
        // The relay payload or metadata should reference the invite
        const inviteId = metadata?.inviteId || relayId;
        const invite = await prisma.projectInvite.findFirst({
          where: {
            OR: [
              { id: inviteId },
              // Fall back: find pending invite for this connection
              { connectionId: connection.id, status: 'pending' },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });

        if (invite && invite.status === 'pending') {
          const newInviteStatus = status === 'completed' ? 'accepted' : 'declined';
          await prisma.projectInvite.update({
            where: { id: invite.id },
            data: {
              status: newInviteStatus,
              acceptedAt: status === 'completed' ? new Date() : undefined,
              declinedAt: status === 'declined' ? new Date() : undefined,
            },
          });
          console.log(`[relay-ack] ProjectInvite ${invite.id} → ${newInviteStatus} (ack from ${targetName})`);

          // If accepted, add as a project member (local user or federated connection)
          if (status === 'completed') {
            const memberWhere = invite.inviteeId
              ? { projectId: invite.projectId, userId: invite.inviteeId }
              : invite.connectionId
              ? { projectId: invite.projectId, connectionId: invite.connectionId }
              : null;

            if (memberWhere) {
              const existingMember = await prisma.projectMember.findFirst({ where: memberWhere });
              if (!existingMember) {
                await prisma.projectMember.create({
                  data: {
                    projectId: invite.projectId,
                    userId: invite.inviteeId || undefined,
                    connectionId: invite.connectionId || undefined,
                    role: invite.role || 'contributor',
                  },
                });
                console.log(`[relay-ack] Added member to project ${invite.projectId} (userId=${invite.inviteeId}, connectionId=${invite.connectionId})`);
              }
            }
          }
        }
      } catch (err: any) {
        console.warn(`[relay-ack] ProjectInvite update failed:`, err?.message);
      }
    }

    // ── 7. Push relay state webhook (local webhook subscribers) ──
    try {
      const { pushRelayStateChanged } = await import('@/lib/webhook-push');
      pushRelayStateChanged(senderUserId, {
        relayId: relay.id,
        threadId: relay.threadId,
        previousState: relay.status,
        newState: status,
        subject: relay.subject,
        message: responsePayload ? (typeof responsePayload === 'string' ? responsePayload : JSON.stringify(responsePayload)) : undefined,
      });
    } catch {}

    return NextResponse.json({ success: true, relayId: relay.id, status });
  } catch (error: any) {
    console.error('POST /api/federation/relay-ack error:', error);
    return NextResponse.json({ error: error.message || 'Relay ack failed' }, { status: 500 });
  }
}
