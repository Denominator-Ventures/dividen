export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { synthesizePatterns, captureIgnoredAmbientSignals } from '@/lib/ambient-learning';

// POST /api/ambient-learning/synthesize
// Triggers pattern synthesis from accumulated ambient relay signals.
// Also captures signals for ignored ambient relays (delivered >48h, no response).
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, capture signals for ignored ambient relays
    const ignoredCount = await captureIgnoredAmbientSignals();

    // Then synthesize patterns from all signals
    const patterns = await synthesizePatterns();

    return NextResponse.json({
      success: true,
      patternsGenerated: patterns.length,
      ignoredRelaysCaptured: ignoredCount,
      patterns: patterns.map(p => ({
        type: p.patternType,
        description: p.description,
        confidence: p.confidence,
        signalCount: p.signalCount,
      })),
    });
  } catch (error: any) {
    console.error('[ambient-learning/synthesize] Error:', error);
    return NextResponse.json(
      { error: 'Failed to synthesize patterns', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/ambient-learning/synthesize
// Returns current active patterns (read-only view).
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/prisma');
    const patterns = await prisma.ambientPattern.findMany({
      where: { isActive: true },
      orderBy: [{ confidence: 'desc' }, { signalCount: 'desc' }],
    });

    const signalCount = await prisma.ambientRelaySignal.count();
    const recentSignals = await prisma.ambientRelaySignal.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });

    return NextResponse.json({
      patterns: patterns.map((p: any) => ({
        id: p.id,
        type: p.patternType,
        scope: p.scope,
        description: p.description,
        insight: p.insight,
        confidence: p.confidence,
        signalCount: p.signalCount,
        updatedAt: p.updatedAt,
      })),
      stats: {
        totalSignals: signalCount,
        signalsLast7Days: recentSignals,
        activePatterns: patterns.length,
      },
    });
  } catch (error: any) {
    console.error('[ambient-learning/synthesize] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patterns', details: error.message },
      { status: 500 }
    );
  }
}
