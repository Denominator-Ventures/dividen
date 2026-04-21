export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runBoardScan, buildContextDigest, CortexCard } from '@/lib/board-cortex';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * GET /api/board/cortex
 * Returns board health analysis and context digest.
 * Can be called on-demand or by a scheduled daemon.
 */
async function _GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const now = new Date();

    // Fetch all cards
    const cards = await prisma.kanbanCard.findMany({
      where: { userId },
      include: {
        checklist: { select: { id: true, text: true, completed: true, assigneeType: true, dueDate: true } },
        contacts: { include: { contact: { select: { name: true } } } },
        project: { select: { name: true } },
        _count: { select: { emailMessages: true, documents: true, recordings: true, calendarEvents: true, commsMessages: true, artifacts: true } },
      },
    }) as unknown as CortexCard[];

    const digest = await buildContextDigest(userId, cards, now);

    return NextResponse.json({ success: true, data: { digest } });
  } catch (err: any) {
    console.error('[board/cortex] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/board/cortex
 * Triggers a full board scan with auto-housekeeping.
 */
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const result = await runBoardScan(userId);

    return NextResponse.json({
      success: true,
      data: {
        health: result.health,
        duplicates: result.duplicates,
        stale: result.stale,
        escalations: result.escalations,
        archives: result.archives,
        duplicateTasks: result.duplicateTasks,
        autoActions: result.autoActions,
      },
    });
  } catch (err: any) {
    console.error('[board/cortex] POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
