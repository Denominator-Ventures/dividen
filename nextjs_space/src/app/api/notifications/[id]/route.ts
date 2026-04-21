import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

// PATCH /api/notifications/[id] — update a rule
async function _PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.eventType !== undefined) updateData.eventType = body.eventType;
    if (body.conditions !== undefined) updateData.conditions = body.conditions ? JSON.stringify(body.conditions) : null;
    if (body.message !== undefined) updateData.message = body.message;
    if (body.style !== undefined) updateData.style = body.style;
    if (body.sound !== undefined) updateData.sound = body.sound;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;

    const rule = await prisma.notificationRule.updateMany({
      where: { id: params.id, userId },
      data: updateData,
    });

    if (rule.count === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.notificationRule.findFirst({ where: { id: params.id } });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] — delete a rule
async function _DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;

    await prisma.notificationRule.deleteMany({
      where: { id: params.id, userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete notification' }, { status: 500 });
  }
}

export const PATCH = withTelemetry(_PATCH);
export const DELETE = withTelemetry(_DELETE);
