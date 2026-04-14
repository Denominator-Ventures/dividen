import { prisma } from '@/lib/prisma';

/**
 * Universal activity logger — every platform event flows through here.
 *
 * actor:  'user' | 'divi' | 'system' | connection/agent name
 * action: snake_case event key (e.g. 'card_created', 'relay_sent')
 * cardId: optional — when set, this entry shows up in the card's activity feed
 */
export async function logActivity(opts: {
  userId: string;
  action: string;
  summary: string;
  actor?: string;        // defaults to 'user'
  metadata?: Record<string, unknown>;
  cardId?: string;       // card-scoped activity (shows on card's timeline)
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: opts.userId,
        action: opts.action,
        actor: opts.actor ?? 'user',
        summary: opts.summary,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : undefined,
        cardId: opts.cardId || null,
      },
    });

    // Cross-user mirroring: if this card has linked cards, mirror the activity
    // onto the originator's card so they see it in their card's feed
    if (opts.cardId) {
      mirrorActivityToLinkedCards(opts).catch(() => {});
    }
  } catch (e) {
    // Activity logging should never break the caller
    console.error('[activity] Failed to log:', e);
  }
}

/**
 * Mirror a card activity entry to all linked cards owned by OTHER users.
 * This is how cross-user card activity works:
 * - Sarah completes a checklist item on her delegated card
 * - Jon sees "Sarah: Completed task X" on HIS origin card's activity feed
 *
 * Runs fire-and-forget — never blocks the caller.
 */
async function mirrorActivityToLinkedCards(opts: {
  userId: string;
  action: string;
  summary: string;
  actor?: string;
  metadata?: Record<string, unknown>;
  cardId?: string;
}): Promise<void> {
  if (!opts.cardId) return;

  try {
    // Find all CardLinks where this card is involved
    const links = await prisma.cardLink.findMany({
      where: {
        OR: [{ fromCardId: opts.cardId }, { toCardId: opts.cardId }],
      },
      include: {
        fromCard: { select: { id: true, userId: true } },
        toCard: { select: { id: true, userId: true } },
      },
    });

    if (links.length === 0) return;

    // Get the acting user's name for the cross-user summary
    const actingUser = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { name: true, email: true },
    });
    const actorLabel = actingUser?.name || actingUser?.email || opts.actor || 'user';

    const mirrorEntries: any[] = [];

    for (const link of links) {
      // Find the "other" card in this link
      const otherCard = link.fromCardId === opts.cardId ? link.toCard : link.fromCard;

      // Don't mirror to cards owned by the same user
      if (otherCard.userId === opts.userId) continue;

      mirrorEntries.push({
        userId: otherCard.userId,
        action: opts.action,
        actor: actorLabel,
        summary: `🔗 ${opts.summary}`,
        metadata: opts.metadata ? JSON.stringify({
          ...opts.metadata,
          _mirrored: true,
          _sourceCardId: opts.cardId,
          _sourceUserId: opts.userId,
        }) : JSON.stringify({ _mirrored: true, _sourceCardId: opts.cardId }),
        cardId: otherCard.id,
        isCrossUser: true,
      });
    }

    if (mirrorEntries.length > 0) {
      await prisma.activityLog.createMany({ data: mirrorEntries });
    }
  } catch (e) {
    console.error('[activity] Mirror to linked cards failed:', e);
  }
}
