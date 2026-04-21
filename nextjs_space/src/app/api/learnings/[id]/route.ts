export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * PATCH /api/learnings/:id — Edit a learning's observation or dismiss it.
 */
async function _PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });
    const userId = (session.user as any).id;

    const existing = await prisma.userLearning.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const update: any = {};

    if (typeof body.observation === 'string') update.observation = body.observation;
    if (typeof body.dismissed === 'boolean') update.dismissed = body.dismissed;
    if (typeof body.isNew === 'boolean') update.isNew = body.isNew;

    const updated = await prisma.userLearning.update({
      where: { id: params.id },
      data: update,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Learning PATCH error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/**
 * DELETE /api/learnings/:id — Permanently delete a learning.
 */
async function _DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });
    const userId = (session.user as any).id;

    const existing = await prisma.userLearning.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    await prisma.userLearning.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Learning DELETE error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export const PATCH = withTelemetry(_PATCH);
export const DELETE = withTelemetry(_DELETE);
