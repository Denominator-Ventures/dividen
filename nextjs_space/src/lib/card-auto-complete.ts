/**
 * Card Auto-Complete
 *
 * When all checklist items on a card are completed, automatically move the card
 * to 'completed' status. This runs after any checklist item completion —
 * whether from the UI (PATCH /api/kanban/[id]/checklist/[itemId]) or from
 * Divi via the complete_checklist action tag.
 *
 * Rules:
 *   - Card must have at least 1 checklist item (empty checklists don't auto-complete)
 *   - ALL items must be completed (no partial)
 *   - Card must not already be 'completed' or 'paused' (don't override paused cards)
 *   - Logs activity when auto-completing
 */

import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

/**
 * Check if all checklist items on a card are completed, and if so,
 * move the card to 'completed' status.
 *
 * @param cardId - The card to check
 * @param userId - The user who owns the card (for activity logging)
 * @returns true if the card was auto-completed, false otherwise
 */
export async function checkAndAutoCompleteCard(
  cardId: string,
  userId?: string
): Promise<boolean> {
  try {
    const card = await prisma.kanbanCard.findUnique({
      where: { id: cardId },
      select: {
        id: true,
        title: true,
        status: true,
        userId: true,
        checklist: {
          select: { id: true, completed: true },
        },
      },
    });

    if (!card) return false;

    // Don't auto-complete if card is already completed or paused
    if (card.status === 'completed' || card.status === 'paused') return false;

    // Must have at least 1 checklist item
    if (card.checklist.length === 0) return false;

    // Check if ALL items are completed
    const allDone = card.checklist.every((item) => item.completed);
    if (!allDone) return false;

    // Auto-complete the card
    await prisma.kanbanCard.update({
      where: { id: card.id },
      data: { status: 'completed' },
    });

    // v2: Propagate completion to linked cards
    const { propagateCardStatusChange } = await import('./card-links');
    await propagateCardStatusChange(card.id, 'completed');

    // Log the auto-completion
    const effectiveUserId = userId || card.userId;
    await logActivity({
      userId: effectiveUserId,
      action: 'card_auto_completed',
      actor: 'system',
      summary: `Card "${card.title}" auto-completed — all ${card.checklist.length} checklist items done`,
    }).catch(() => {});

    return true;
  } catch (err) {
    console.error('[card-auto-complete] Error checking card:', cardId, err);
    return false;
  }
}
