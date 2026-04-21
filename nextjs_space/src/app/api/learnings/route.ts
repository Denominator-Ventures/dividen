export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * GET /api/learnings — List user's learnings with optional filters.
 * Query: ?category=style&includeNew=true
 */
async function _GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const where: any = { userId, dismissed: false };
    if (category) where.category = category;

    const learnings = await prisma.userLearning.findMany({
      where,
      orderBy: [{ isNew: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    const newCount = await prisma.userLearning.count({
      where: { userId, isNew: true, dismissed: false },
    });

    return NextResponse.json({ success: true, data: { learnings, newCount } });
  } catch (err: any) {
    console.error('Learnings GET error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/**
 * POST /api/learnings — Mark learnings as seen (batch).
 * Body: { markSeen: true } — marks all isNew=true as isNew=false
 */
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();

    if (body.markSeen) {
      await prisma.userLearning.updateMany({
        where: { userId, isNew: true },
        data: { isNew: false },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Learnings POST error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
