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
