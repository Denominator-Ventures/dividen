export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * POST /api/learnings/analyze — Analyze recent behavior signals and generate learnings.
 * Called periodically or on-demand to process accumulated signals.
 */
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });
    const userId = (session.user as any).id;

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days

    const signals = await prisma.behaviorSignal.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    if (signals.length < 5) {
      return NextResponse.json({ success: true, data: { generated: 0, reason: 'Not enough signals yet' } });
    }

    const newLearnings: { category: string; observation: string; confidence: number; source: string; evidence: string }[] = [];

    // ── Pattern 1: Peak productivity hours ────────────────────────────────
    const hourCounts: Record<number, number> = {};
    const completionByHour: Record<number, number> = {};
    for (const s of signals) {
      if (s.hourOfDay !== null) {
        hourCounts[s.hourOfDay] = (hourCounts[s.hourOfDay] || 0) + 1;
        if (s.action === 'queue_complete') {
          completionByHour[s.hourOfDay] = (completionByHour[s.hourOfDay] || 0) + 1;
        }
      }
    }

    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([h]) => parseInt(h));

    if (peakHours.length >= 2) {
      const formatHour = (h: number) => {
        if (h === 0) return '12 AM';
        if (h < 12) return `${h} AM`;
        if (h === 12) return '12 PM';
        return `${h - 12} PM`;
      };

      const existing = await prisma.userLearning.findFirst({
        where: { userId, category: 'schedule', source: 'behavior_analysis', observation: { contains: 'most active' } },
      });

      if (!existing) {
        newLearnings.push({
          category: 'schedule',
          observation: `You're most active between ${formatHour(peakHours[0])} and ${formatHour(peakHours[peakHours.length - 1])}. Divi will prioritize high-impact items during these hours.`,
          confidence: Math.min(signals.length / 50, 0.9),
          source: 'behavior_analysis',
          evidence: JSON.stringify({ peakHours, sampleSize: signals.length }),
        });
      }
    }

    // ── Pattern 2: Task completion speed by type ──────────────────────────
    const completeSignals = signals.filter(s => s.action === 'queue_complete');
    const discussSignals = signals.filter(s => s.action === 'email_discuss');

    if (discussSignals.length >= 3) {
      const existing = await prisma.userLearning.findFirst({
        where: { userId, category: 'workflow', source: 'behavior_analysis', observation: { contains: 'discuss' } },
      });
      if (!existing) {
        newLearnings.push({
          category: 'workflow',
          observation: `You frequently use "Discuss with Divi" for emails (${discussSignals.length} times this week). Consider setting up auto-triage for your most active inboxes.`,
          confidence: 0.7,
          source: 'behavior_analysis',
          evidence: JSON.stringify({ discussCount: discussSignals.length }),
        });
      }
    }

    // ── Pattern 3: Day-of-week patterns ───────────────────────────────────
    const dayCounts: Record<number, number> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const s of signals) {
      if (s.dayOfWeek !== null) {
        dayCounts[s.dayOfWeek] = (dayCounts[s.dayOfWeek] || 0) + 1;
      }
    }
    const quietDays = Object.entries(dayCounts)
      .filter(([, count]) => count <= 2)
      .map(([d]) => dayNames[parseInt(d)]);

    if (quietDays.length > 0 && quietDays.length <= 3) {
      const existing = await prisma.userLearning.findFirst({
        where: { userId, category: 'schedule', source: 'behavior_analysis', observation: { contains: 'quiet' } },
      });
      if (!existing) {
        newLearnings.push({
          category: 'schedule',
          observation: `${quietDays.join(' and ')} ${quietDays.length === 1 ? 'is' : 'are'} your quietest ${quietDays.length === 1 ? 'day' : 'days'}. Divi will batch non-urgent items for your active days.`,
          confidence: 0.6,
          source: 'behavior_analysis',
          evidence: JSON.stringify({ dayCounts, quietDays }),
        });
      }
    }

    // ── Pattern 4: Capability usage ───────────────────────────────────────
    const capUsage = await prisma.capabilityUsageLog.groupBy({
      by: ['capabilityId', 'capabilityName'],
      where: { userId, createdAt: { gte: since } },
      _count: true,
    });

    const installedCaps = await prisma.userCapability.findMany({
      where: { userId, status: 'active' },
      include: { capability: { select: { id: true, name: true } } },
    });

    const usedCapIds = new Set(capUsage.map(c => c.capabilityId));
    const unusedCaps = installedCaps.filter(c => !usedCapIds.has(c.capabilityId));

    if (unusedCaps.length > 0) {
      const existing = await prisma.userLearning.findFirst({
        where: { userId, category: 'capability_usage', source: 'capability_usage', dismissed: false },
      });
      if (!existing) {
        const names = unusedCaps.slice(0, 3).map(c => c.capability.name).join(', ');
        newLearnings.push({
          category: 'capability_usage',
          observation: `${unusedCaps.length} installed ${unusedCaps.length === 1 ? 'capability has' : 'capabilities have'} not been used this week: ${names}${unusedCaps.length > 3 ? ` and ${unusedCaps.length - 3} more` : ''}. Consider uninstalling unused ones to keep your agent focused.`,
          confidence: 0.8,
          source: 'capability_usage',
          evidence: JSON.stringify({ unusedCaps: unusedCaps.map(c => ({ id: c.capabilityId, name: c.capability.name })) }),
        });
      }
    }

    // ── Create learnings ──────────────────────────────────────────────────
    if (newLearnings.length > 0) {
      await prisma.userLearning.createMany({
        data: newLearnings.map(l => ({ ...l, userId })),
      });

      // Log activity for notification
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'learning_generated',
          actor: 'divi',
          summary: `Divi learned ${newLearnings.length} new ${newLearnings.length === 1 ? 'pattern' : 'patterns'} from your recent activity`,
          metadata: JSON.stringify({ count: newLearnings.length, category: 'intelligence', categories: newLearnings.map(l => l.category) }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { generated: newLearnings.length, learnings: newLearnings },
    });
  } catch (err: any) {
    console.error('Learning analysis error:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export const POST = withTelemetry(_POST);
