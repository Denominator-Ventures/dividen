export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * GET /api/feedback — list feedback (admin only)
 * POST /api/feedback — submit feedback (any authenticated user)
 * PATCH /api/feedback — update feedback status/note (admin only)
 */
async function _GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const email = (session.user as any).email;

    // Only admin can list all feedback
    if (email !== 'admin@dividen.ai') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status && status !== 'all') where.status = status;

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.feedback.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: { feedback, total } });
  } catch (error: any) {
    console.error('GET /api/feedback error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const { message, category, rating, page } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message too long (max 5000 chars)' }, { status: 400 });
    }

    const validCategories = ['general', 'bug', 'feature', 'onboarding', 'ux'];
    const safeCategory = validCategories.includes(category) ? category : 'general';
    const safeRating = typeof rating === 'number' && rating >= 1 && rating <= 5 ? rating : null;

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        message: message.trim(),
        category: safeCategory,
        rating: safeRating,
        page: typeof page === 'string' ? page.slice(0, 100) : null,
      },
    });

    return NextResponse.json({ success: true, data: { id: feedback.id } });
  } catch (error: any) {
    console.error('POST /api/feedback error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function _PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const email = (session.user as any).email;

    if (email !== 'admin@dividen.ai') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, adminNote } = body;

    if (!id) return NextResponse.json({ error: 'Feedback ID required' }, { status: 400 });

    const validStatuses = ['new', 'reviewed', 'resolved', 'archived'];
    const updateData: any = {};
    if (status && validStatuses.includes(status)) updateData.status = status;
    if (typeof adminNote === 'string') updateData.adminNote = adminNote.slice(0, 2000);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const feedback = await prisma.feedback.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: feedback });
  } catch (error: any) {
    console.error('PATCH /api/feedback error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
export const PATCH = withTelemetry(_PATCH);
