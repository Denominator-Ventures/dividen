export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * POST /api/behavior-signals — Fire-and-forget behavior signal collection.
 * Client sends signals as users interact with the dashboard.
 */
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const { action, context, duration } = body;

    if (!action) return NextResponse.json({ success: false, error: 'action required' }, { status: 400 });

    const now = new Date();

    await prisma.behaviorSignal.create({
      data: {
        userId,
        action,
        context: context ? JSON.stringify(context) : null,
        dayOfWeek: now.getDay(),
        hourOfDay: now.getHours(),
        duration: duration || null,
      },
    });

    // Auto-trigger behavior learning synthesis every 25 signals
    // Fire-and-forget — don't block the response
    const signalCount = await prisma.behaviorSignal.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (signalCount > 0 && signalCount % 25 === 0) {
      import('@/lib/ambient-learning').then(({ synthesizeBehaviorLearnings }) => {
        synthesizeBehaviorLearnings(userId).catch(() => {});
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Behavior signal error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/**
 * GET /api/behavior-signals — Analytics: return aggregated behavior patterns.
 */
async function _GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get raw signals
    const signals = await prisma.behaviorSignal.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Aggregate by action
    const byAction: Record<string, number> = {};
    const byHour: Record<number, number> = {};
    const byDay: Record<number, number> = {};

    for (const s of signals) {
      byAction[s.action] = (byAction[s.action] || 0) + 1;
      if (s.hourOfDay !== null) byHour[s.hourOfDay] = (byHour[s.hourOfDay] || 0) + 1;
      if (s.dayOfWeek !== null) byDay[s.dayOfWeek] = (byDay[s.dayOfWeek] || 0) + 1;
    }

    // Find peak hours and days
    const peakHour = Object.entries(byHour).sort(([, a], [, b]) => b - a)[0];
    const peakDay = Object.entries(byDay).sort(([, a], [, b]) => b - a)[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return NextResponse.json({
      success: true,
      data: {
        totalSignals: signals.length,
        byAction,
        byHour,
        byDay,
        peakHour: peakHour ? { hour: parseInt(peakHour[0]), count: peakHour[1] } : null,
        peakDay: peakDay ? { day: dayNames[parseInt(peakDay[0])], count: peakDay[1] } : null,
        period: `${days} days`,
      },
    });
  } catch (err: any) {
    console.error('Behavior signals GET error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
