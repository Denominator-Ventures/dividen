/**
 * Linked Kards — cross-user card visibility
 *
 * When a relay creates work on another user's board, the originator's card
 * and the new card become linked. Both users' Divis see the linked card's
 * status/progress in their system prompt context.
 */

import { prisma } from '@/lib/prisma';

export interface CardLinkInfo {
  linkId: string;
  linkedCardId: string;
  linkedCardTitle: string;
  linkedCardStatus: string;
  linkedCardPriority: string;
  linkedUserId: string;
  linkedUserName: string | null;
  linkType: string;
  direction: 'outbound' | 'inbound'; // outbound = I delegated TO them, inbound = they delegated TO me
  checklistProgress?: string; // e.g. "3/5"
}

/**
 * Create a bidirectional card link.
 * Idempotent — won't create duplicates due to @@unique constraint.
 */
export async function linkCards(
  fromCardId: string,
  toCardId: string,
  opts?: { relayId?: string; linkType?: string }
): Promise<{ id: string } | null> {
  try {
    const link = await prisma.cardLink.upsert({
      where: {
        fromCardId_toCardId: { fromCardId, toCardId },
      },
      update: {},
      create: {
        fromCardId,
        toCardId,
        relayId: opts?.relayId || null,
        linkType: opts?.linkType || 'delegation',
      },
    });
    return { id: link.id };
  } catch (e) {
    console.error('[card-links] Failed to create link:', e);
    return null;
  }
}

/**
 * Get all linked cards for a given card (both directions).
 */
export async function getLinkedCards(cardId: string): Promise<CardLinkInfo[]> {
  const [outbound, inbound] = await Promise.all([
    prisma.cardLink.findMany({
      where: { fromCardId: cardId },
      include: {
        toCard: {
          select: {
            id: true, title: true, status: true, priority: true, userId: true,
            user: { select: { name: true } },
            checklist: { select: { completed: true } },
          },
        },
      },
    }),
    prisma.cardLink.findMany({
      where: { toCardId: cardId },
      include: {
        fromCard: {
          select: {
            id: true, title: true, status: true, priority: true, userId: true,
            user: { select: { name: true } },
            checklist: { select: { completed: true } },
          },
        },
      },
    }),
  ]);

  const results: CardLinkInfo[] = [];

  for (const link of outbound) {
    const c = link.toCard;
    const done = c.checklist.filter(t => t.completed).length;
    results.push({
      linkId: link.id,
      linkedCardId: c.id,
      linkedCardTitle: c.title,
      linkedCardStatus: c.status,
      linkedCardPriority: c.priority,
      linkedUserId: c.userId,
      linkedUserName: c.user?.name || null,
      linkType: link.linkType,
      direction: 'outbound',
      checklistProgress: c.checklist.length > 0 ? `${done}/${c.checklist.length}` : undefined,
    });
  }

  for (const link of inbound) {
    const c = link.fromCard;
    const done = c.checklist.filter(t => t.completed).length;
    results.push({
      linkId: link.id,
      linkedCardId: c.id,
      linkedCardTitle: c.title,
      linkedCardStatus: c.status,
      linkedCardPriority: c.priority,
      linkedUserId: c.userId,
      linkedUserName: c.user?.name || null,
      linkType: link.linkType,
      direction: 'inbound',
      checklistProgress: c.checklist.length > 0 ? `${done}/${c.checklist.length}` : undefined,
    });
  }

  return results;
}

/**
 * Get all linked cards for a user's entire board (batch).
 * Returns a map of cardId → CardLinkInfo[].
 */
export async function getLinkedCardsForUser(userId: string): Promise<Record<string, CardLinkInfo[]>> {
  // Get all card IDs for this user
  const userCards = await prisma.kanbanCard.findMany({
    where: { userId },
    select: { id: true },
  });
  const cardIds = userCards.map(c => c.id);
  if (cardIds.length === 0) return {};

  const [outbound, inbound] = await Promise.all([
    prisma.cardLink.findMany({
      where: { fromCardId: { in: cardIds } },
      include: {
        toCard: {
          select: {
            id: true, title: true, status: true, priority: true, userId: true,
            user: { select: { name: true } },
            checklist: { select: { completed: true } },
          },
        },
      },
    }),
    prisma.cardLink.findMany({
      where: { toCardId: { in: cardIds } },
      include: {
        fromCard: {
          select: {
            id: true, title: true, status: true, priority: true, userId: true,
            user: { select: { name: true } },
            checklist: { select: { completed: true } },
          },
        },
      },
    }),
  ]);

  const result: Record<string, CardLinkInfo[]> = {};

  for (const link of outbound) {
    const c = link.toCard;
    const done = c.checklist.filter(t => t.completed).length;
    if (!result[link.fromCardId]) result[link.fromCardId] = [];
    result[link.fromCardId].push({
      linkId: link.id,
      linkedCardId: c.id,
      linkedCardTitle: c.title,
      linkedCardStatus: c.status,
      linkedCardPriority: c.priority,
      linkedUserId: c.userId,
      linkedUserName: c.user?.name || null,
      linkType: link.linkType,
      direction: 'outbound',
      checklistProgress: c.checklist.length > 0 ? `${done}/${c.checklist.length}` : undefined,
    });
  }

  for (const link of inbound) {
    const c = link.fromCard;
    const done = c.checklist.filter(t => t.completed).length;
    if (!result[link.toCardId]) result[link.toCardId] = [];
    result[link.toCardId].push({
      linkId: link.id,
      linkedCardId: c.id,
      linkedCardTitle: c.title,
      linkedCardStatus: c.status,
      linkedCardPriority: c.priority,
      linkedUserId: c.userId,
      linkedUserName: c.user?.name || null,
      linkType: link.linkType,
      direction: 'inbound',
      checklistProgress: c.checklist.length > 0 ? `${done}/${c.checklist.length}` : undefined,
    });
  }

  return result;
}

/**
 * Format linked card info for system prompt injection.
 */
export function formatLinkedCardsForPrompt(links: CardLinkInfo[]): string {
  if (links.length === 0) return '';
  return links.map(l => {
    const dir = l.direction === 'outbound' ? '→' : '←';
    const who = l.linkedUserName || 'unknown user';
    const progress = l.checklistProgress ? ` ✓${l.checklistProgress}` : '';
    return `${dir}${l.linkType}:"${l.linkedCardTitle}" (${l.linkedCardStatus}) by ${who}${progress}`;
  }).join(' | ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// v2: Auto-linking & Status Propagation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Auto-link a newly created card to its origin when the card was created from
 * relay context. This replaces the fragile "hope the LLM passes linkedFromCardId"
 * approach with deterministic infrastructure.
 *
 * Called after any card creation. Stamps originCardId/originUserId/sourceRelayId
 * on the new card and creates the CardLink bidirectionally.
 *
 * @param newCardId - The just-created card ID
 * @param userId - The user who owns the new card (receiver)
 * @param opts.linkedFromCardId - Explicit origin card (from LLM param — manual override)
 * @param opts.relayId - Explicit relay ID (from LLM param)
 * @param opts.linkType - Link type (default: 'delegation')
 */
export async function autoLinkFromRelay(
  newCardId: string,
  userId: string,
  opts?: { linkedFromCardId?: string; relayId?: string; linkType?: string }
): Promise<void> {
  try {
    // Priority 1: Explicit linkedFromCardId from LLM params (manual override)
    if (opts?.linkedFromCardId) {
      await stampProvenanceAndLink(newCardId, opts.linkedFromCardId, opts.relayId, opts.linkType);
      return;
    }

    // Priority 2: Find recent inbound relay with assign_task intent that has a cardId
    // This catches the case where the receiving Divi creates a card in response to a relay
    const recentRelay = await prisma.agentRelay.findFirst({
      where: {
        toUserId: userId,
        direction: 'inbound',
        intent: { in: ['assign_task', 'custom'] },
        cardId: { not: null },
        status: { in: ['pending', 'delivered', 'agent_handling', 'user_review'] },
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // Within last 30 minutes
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, cardId: true, fromUserId: true },
    });

    if (recentRelay?.cardId) {
      await stampProvenanceAndLink(newCardId, recentRelay.cardId, recentRelay.id, 'delegation');
      console.log(`[card-links] Auto-linked card ${newCardId} from relay ${recentRelay.id} (origin card: ${recentRelay.cardId})`);
    }
  } catch (e) {
    console.error('[card-links] autoLinkFromRelay error:', e);
    // Non-fatal — card was already created, linking is bonus
  }
}

/**
 * Internal: stamp provenance fields on the card and create the CardLink.
 */
async function stampProvenanceAndLink(
  newCardId: string,
  originCardId: string,
  relayId?: string | null,
  linkType?: string
): Promise<void> {
  // Get the origin card to find the origin user
  const originCard = await prisma.kanbanCard.findUnique({
    where: { id: originCardId },
    select: { userId: true },
  });

  // Stamp provenance on the new card
  await prisma.kanbanCard.update({
    where: { id: newCardId },
    data: {
      originCardId,
      originUserId: originCard?.userId || null,
      sourceRelayId: relayId || null,
    },
  });

  // Create the bidirectional link
  await linkCards(originCardId, newCardId, {
    relayId: relayId || undefined,
    linkType: linkType || 'delegation',
  });
}

/**
 * Propagate a card's status/priority change to all linked CardLink rows.
 * Updates the cached linkedStatus/linkedPriority on both directions.
 * Optionally sends update relays back to originators.
 *
 * @param cardId - The card that just changed
 * @param newStatus - The new status (or null if unchanged)
 * @param newPriority - The new priority (or null if unchanged)
 */
export async function propagateCardStatusChange(
  cardId: string,
  newStatus?: string | null,
  newPriority?: string | null
): Promise<void> {
  try {
    if (!newStatus && !newPriority) return;

    const now = new Date();

    // Update cached status on all CardLinks where this card is the target (toCardId)
    // These are the "outbound" links from the originator's perspective
    if (newStatus || newPriority) {
      const updateData: any = { lastSyncedAt: now };
      if (newStatus) updateData.linkedStatus = newStatus;
      if (newPriority) updateData.linkedPriority = newPriority;

      await prisma.cardLink.updateMany({
        where: { toCardId: cardId },
        data: updateData,
      });

      // Also update links where this card is the source (fromCardId)
      // (in case someone queries from the other direction)
      await prisma.cardLink.updateMany({
        where: { fromCardId: cardId },
        data: updateData,
      });
    }

    // Send update relay back to originator if this is a delegated card
    if (newStatus) {
      const card = await prisma.kanbanCard.findUnique({
        where: { id: cardId },
        select: { id: true, title: true, status: true, originCardId: true, originUserId: true, sourceRelayId: true, userId: true },
      });

      if (card?.originUserId && card.originUserId !== card.userId) {
        // Find the connection between these users
        const connection = await prisma.connection.findFirst({
          where: {
            OR: [
              { requesterId: card.userId, accepterId: card.originUserId },
              { requesterId: card.originUserId, accepterId: card.userId },
            ],
            status: 'active',
          },
          select: { id: true },
        });

        if (connection) {
          await prisma.agentRelay.create({
            data: {
              connectionId: connection.id,
              fromUserId: card.userId,
              toUserId: card.originUserId,
              direction: 'outbound',
              type: 'update',
              intent: 'share_update',
              subject: `Card status update: "${card.title}" → ${newStatus}`,
              payload: JSON.stringify({
                cardId: card.id,
                originCardId: card.originCardId,
                newStatus,
                newPriority: newPriority || undefined,
              }),
              status: 'pending',
              priority: 'low',
              cardId: card.originCardId || undefined,
              // Thread to the original relay if available
              parentRelayId: card.sourceRelayId || undefined,
            },
          });
          console.log(`[card-links] Sent status update relay to originator ${card.originUserId} for card ${cardId}`);
        }
      }
    }
  } catch (e) {
    console.error('[card-links] propagateCardStatusChange error:', e);
    // Non-fatal — status change already happened
  }
}
