export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runBoardScan } from '@/lib/board-cortex';
import { logActivity } from '@/lib/activity';

/**
 * POST /api/cron/cortex-scan
 *
 * Scheduled Board Cortex scan — runs for all active users.
 * Called by the scheduled daemon on a cadence (e.g., every 6 hours).
 *
 * Auth: Bearer ADMIN_PASSWORD or internal cron secret.
 * This is NOT user-facing — it's a system endpoint.
 *
 * Optional query params:
 *   ?userId=<id>  — scan a single user (for testing)
 *
 * What it does per user:
 *   1. Runs runBoardScan() — detects duplicates, stale, escalations, archives
 *   2. Auto-escalates deadline-approaching cards
 *   3. Persists BoardInsight records
 *   4. Logs a summary activity entry
 */
export async function POST(req: NextRequest) {
  try {
    // Auth: admin password or cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = req.headers.get('x-cron-secret');
    const adminPass = process.env.ADMIN_PASSWORD;

    const isAuthed =
      (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === adminPass) ||
      (cronSecret && cronSecret === adminPass);

    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('userId');

    // Get users to scan
    let users: { id: string; name: string | null; email: string }[];
    if (targetUserId) {
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, email: true },
      });
      users = user ? [user] : [];
    } else {
      // All active users who have at least 1 kanban card
      users = await prisma.user.findMany({
        where: {
          kanbanCards: { some: {} },
        },
        select: { id: true, name: true, email: true },
      });
    }

    const results: {
      userId: string;
      name: string | null;
      cardCount: number;
      duplicates: number;
      stale: number;
      escalations: number;
      archives: number;
      autoActions: string[];
      error?: string;
    }[] = [];

    for (const user of users) {
      try {
        const scan = await runBoardScan(user.id);

        // Log activity if anything notable was found
        const notable = scan.duplicates.length + scan.stale.length + scan.escalations.length + scan.archives.length;
        if (notable > 0) {
          const parts: string[] = [];
          if (scan.duplicates.length) parts.push(`${scan.duplicates.length} duplicate${scan.duplicates.length > 1 ? 's' : ''}`);
          if (scan.stale.length) parts.push(`${scan.stale.length} stale`);
          if (scan.escalations.length) parts.push(`${scan.escalations.length} escalated`);
          if (scan.archives.length) parts.push(`${scan.archives.length} archive-ready`);

          await logActivity({
            userId: user.id,
            action: 'cortex_scheduled_scan',
            actor: 'system',
            summary: `\u{1F9E0} Scheduled board scan: ${parts.join(', ')}. ${scan.autoActions.length} auto-actions taken.`,
          }).catch(() => {});
        }

        results.push({
          userId: user.id,
          name: user.name,
          cardCount: scan.health.totalCards,
          duplicates: scan.duplicates.length,
          stale: scan.stale.length,
          escalations: scan.escalations.length,
          archives: scan.archives.length,
          autoActions: scan.autoActions,
        });
      } catch (err: any) {
        console.error(`[cortex-scan] Error for user ${user.id}:`, err.message);
        results.push({
          userId: user.id,
          name: user.name,
          cardCount: 0,
          duplicates: 0,
          stale: 0,
          escalations: 0,
          archives: 0,
          autoActions: [],
          error: err.message,
        });
      }
    }

    const totalActions = results.reduce((sum, r) => sum + r.autoActions.length, 0);
    const totalIssues = results.reduce((sum, r) => sum + r.duplicates + r.stale + r.escalations + r.archives, 0);

    return NextResponse.json({
      success: true,
      scannedUsers: results.length,
      totalIssuesFound: totalIssues,
      totalAutoActions: totalActions,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[cortex-scan] Fatal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
