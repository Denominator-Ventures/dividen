export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/agent-quality — Record a quality signal for a marketplace agent.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const { agentId, signal, metadata } = body;

    if (!agentId || !signal) {
      return NextResponse.json({ success: false, error: 'agentId and signal required' }, { status: 400 });
    }

    const scoreMap: Record<string, number> = {
      no_correction: 0.8,
      widget_confirmed: 0.9,
      payment_completed: 1.0,
      user_edited: -0.3,
      follow_up_needed: -0.5,
    };

    await prisma.agentQualityScore.create({
      data: {
        agentId,
        userId,
        signal,
        score: scoreMap[signal] || 0,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Update agent's aggregate quality score
    const scores = await prisma.agentQualityScore.aggregate({
      where: { agentId },
      _avg: { score: true },
      _count: true,
    });

    if (scores._count >= 3 && scores._avg.score !== null) {
      // Store aggregate on the agent (if they have a metadata field)
      // For now, log it
      console.log(`Agent ${agentId} quality: avg=${scores._avg.score?.toFixed(2)}, n=${scores._count}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Agent quality error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/**
 * GET /api/agent-quality?agentId=xxx — Get quality summary for an agent.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) return NextResponse.json({ success: false, error: 'agentId required' }, { status: 400 });

    const scores = await prisma.agentQualityScore.aggregate({
      where: { agentId },
      _avg: { score: true },
      _count: true,
    });

    const bySignal = await prisma.agentQualityScore.groupBy({
      by: ['signal'],
      where: { agentId },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        avgScore: scores._avg.score || 0,
        totalInteractions: scores._count,
        bySignal: Object.fromEntries(bySignal.map(s => [s.signal, s._count])),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
