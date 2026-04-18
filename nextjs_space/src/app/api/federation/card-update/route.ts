export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

/**
 * POST /api/federation/card-update
 *
 * Bidirectional Kanban sync endpoint (v2.2.0 / FVP Build 524 compat).
 * When a federated peer moves or updates a Kanban card that is linked to us,
 * they POST here so we can reflect the status/priority/title change locally
 * and keep comms + activity log in sync.
 *
 * Lookup precedence (to locate OUR local card):
 *   1. body.localCardId → a direct KanbanCard.id they have recorded on their side
 *   2. body.peerCardId → lookup via CardLink.externalCardId
 *   3. body.relayId → lookup via AgentRelay.peerRelayId OR AgentRelay.id → relay.cardId
 *   4. Fallback: create a placeholder CommsMessage only (audit trail intact)
 *
 * Response envelope:
 *   success:true  → { success:true, matched:true, localCardId, newStage, newPriority }
 *   success:false → { success:false, error, code }  where code in
 *     ['missing_token','federation_disabled','invalid_payload','connection_not_found',
 *      'card_not_found','internal_error']
 */
export async function POST(req: NextRequest) {
  try {
    const federationToken = req.headers.get('x-federation-token');
    if (!federationToken) {
      return NextResponse.json(
        { success: false, error: 'Missing x-federation-token header', code: 'missing_token' },
        { status: 401 },
      );
    }

    const fedConfig = await prisma.federationConfig.findFirst();
    if (!fedConfig || !fedConfig.allowInbound) {
      return NextResponse.json(
        { success: false, error: 'Inbound federation disabled', code: 'federation_disabled' },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body', code: 'invalid_payload' },
        { status: 400 },
      );
    }

    const {
      localCardId,     // OUR card ID if the peer knows it (best case)
      peerCardId,      // THEIR card ID — look up via CardLink.externalCardId
      relayId,         // OUR local relay id the peer may be echoing
      peerRelayId,     // THEIR relay id — look up AgentRelay.peerRelayId
      newStage,        // e.g. 'leads' | 'working' | 'completed' | 'archived'
      newPriority,
      title,
      reason,
      timestamp,
      fromUserName,
      fromUserEmail,
    } = body;

    if (!newStage && !newPriority && !title) {
      return NextResponse.json(
        { success: false, error: 'At least one of newStage, newPriority, title is required', code: 'invalid_payload' },
        { status: 400 },
      );
    }

    // Validate federation token → active connection
    const connection = await prisma.connection.findFirst({
      where: {
        isFederated: true,
        federationToken,
        status: 'active',
      },
    });

    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'No active federated connection for this token', code: 'connection_not_found' },
        { status: 404 },
      );
    }

    // ── Locate local card ──
    let card: any = null;

    if (localCardId) {
      card = await prisma.kanbanCard.findUnique({ where: { id: localCardId } });
    }

    if (!card && peerCardId) {
      // CardLink.externalCardId === peerCardId. The local card is either fromCard or toCard.
      const link = await prisma.cardLink.findFirst({
        where: { externalCardId: peerCardId, externalInstanceUrl: connection.peerInstanceUrl || undefined },
        include: { fromCard: true, toCard: true },
      });
      if (link) {
        // Prefer the card owned by this connection's local user
        card = link.fromCard || link.toCard;
      }
    }

    if (!card && peerRelayId) {
      const relay = await prisma.agentRelay.findFirst({
        where: { peerRelayId, connectionId: connection.id },
      });
      if (relay?.cardId) {
        card = await prisma.kanbanCard.findUnique({ where: { id: relay.cardId } });
      }
    }

    if (!card && relayId) {
      const relay = await prisma.agentRelay.findUnique({ where: { id: relayId } });
      if (relay?.cardId) {
        card = await prisma.kanbanCard.findUnique({ where: { id: relay.cardId } });
      }
    }

    // For federated connections, local owner is always `requesterId` (accepterId is null on this side).
    // For local connections, prefer card.userId; fall back to requester.
    const ownerUserId = card?.userId || connection.requesterId;

    const peerLabel = fromUserName || fromUserEmail || connection.peerUserName || connection.peerUserEmail || 'Peer agent';

    // ── If we couldn't find the card, keep the audit trail (comms fallback) and return matched:false ──
    if (!card) {
      try {
        await prisma.commsMessage.create({
          data: {
            sender: 'divi',
            content: `📡 ${peerLabel}'s Divi sent a card update we couldn't map locally (newStage: ${newStage || '—'}${title ? `, title: ${title}` : ''}). Their card id: ${peerCardId || '—'}`,
            state: 'new',
            priority: 'low',
            userId: ownerUserId,
            metadata: JSON.stringify({
              type: 'federation_card_update_unmapped',
              peerCardId,
              relayId,
              peerRelayId,
              newStage,
              newPriority,
              title,
              reason,
              connectionId: connection.id,
              peerInstanceUrl: connection.peerInstanceUrl,
              fallback: true,
            }),
          },
        });
      } catch {}

      await logActivity({
        userId: ownerUserId,
        action: 'federation_card_update_unmapped',
        summary: `📡 ${peerLabel} sent card-update for an unknown card (peerCardId=${peerCardId || '—'})`,
        metadata: { connectionId: connection.id, peerCardId, relayId, peerRelayId, newStage, newPriority },
      }).catch(() => {});

      return NextResponse.json({
        success: false,
        matched: false,
        error: 'No matching local card',
        code: 'card_not_found',
      }, { status: 404 });
    }

    // ── Apply updates ──
    const updateData: any = { updatedAt: new Date() };
    const previous: any = { status: card.status, priority: card.priority, title: card.title };

    if (newStage && newStage !== card.status) {
      updateData.status = newStage;
    }
    if (newPriority && newPriority !== card.priority) {
      updateData.priority = newPriority;
    }
    if (title && title !== card.title) {
      updateData.title = title;
    }

    const updated = await prisma.kanbanCard.update({
      where: { id: card.id },
      data: updateData,
    });

    // Update CardLink.changeLog if present (link where local card is either from or to)
    try {
      const existingLink = await prisma.cardLink.findFirst({
        where: {
          OR: [{ fromCardId: card.id }, { toCardId: card.id }],
          externalInstanceUrl: connection.peerInstanceUrl || undefined,
        },
      });
      if (existingLink) {
        let log: any[] = [];
        try { log = existingLink.changeLog ? JSON.parse(existingLink.changeLog) : []; } catch {}
        log.push({
          direction: 'inbound',
          at: timestamp || new Date().toISOString(),
          from: peerLabel,
          previous,
          changes: { newStage, newPriority, title },
          reason: reason || null,
        });
        if (log.length > 50) log = log.slice(-50);
        await prisma.cardLink.update({
          where: { id: existingLink.id },
          data: { changeLog: JSON.stringify(log), lastSyncedAt: new Date() },
        });
      }
    } catch (linkErr: any) {
      console.warn('[card-update] changeLog update failed:', linkErr?.message);
    }

    // Comms message on the OWNER side so they see the sync
    try {
      const stageChangeLabel = newStage && newStage !== previous.status ? ` moved "${previous.status}" → **${newStage}**` : '';
      const titleChangeLabel = title && title !== previous.title ? ` retitled to "${title}"` : '';
      const priorityChangeLabel = newPriority && newPriority !== previous.priority ? ` priority → ${newPriority}` : '';
      const summary = [stageChangeLabel, priorityChangeLabel, titleChangeLabel].filter(Boolean).join(', ');

      await prisma.commsMessage.create({
        data: {
          sender: 'divi',
          content: `📡 ${peerLabel}'s Divi synced card "${updated.title}"${summary || ''}${reason ? ` — ${reason}` : ''}`,
          state: 'new',
          priority: 'normal',
          userId: ownerUserId,
          linkedCardId: card.id,
          metadata: JSON.stringify({
            type: 'federation_card_update',
            localCardId: card.id,
            peerCardId,
            newStage,
            newPriority,
            title,
            reason,
            connectionId: connection.id,
            peerInstanceUrl: connection.peerInstanceUrl,
            previous,
          }),
        },
      });
    } catch {}

    // Activity log
    await logActivity({
      userId: ownerUserId,
      action: 'federation_card_update_received',
      summary: `📡 ${peerLabel}'s Divi updated card "${updated.title}"${newStage ? ` → ${newStage}` : ''}`,
      metadata: {
        localCardId: card.id,
        peerCardId,
        relayId,
        peerRelayId,
        newStage,
        newPriority,
        title,
        reason,
        connectionId: connection.id,
        peerInstanceUrl: connection.peerInstanceUrl,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      matched: true,
      localCardId: card.id,
      newStage: updateData.status || card.status,
      newPriority: updateData.priority || card.priority,
      title: updateData.title || card.title,
    });
  } catch (error: any) {
    console.error('POST /api/federation/card-update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Card update failed', code: 'internal_error' },
      { status: 500 },
    );
  }
}
