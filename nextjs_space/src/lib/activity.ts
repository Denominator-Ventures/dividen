import { prisma } from '@/lib/prisma';

/**
 * Universal activity logger — every platform event flows through here.
 *
 * actor:  'user' | 'divi' | 'system' | connection/agent name
 * action: snake_case event key (e.g. 'card_created', 'relay_sent')
 */
export async function logActivity(opts: {
  userId: string;
  action: string;
  summary: string;
  actor?: string;        // defaults to 'user'
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: opts.userId,
        action: opts.action,
        actor: opts.actor ?? 'user',
        summary: opts.summary,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : undefined,
      },
    });
  } catch (e) {
    // Activity logging should never break the caller
    console.error('[activity] Failed to log:', e);
  }
}
