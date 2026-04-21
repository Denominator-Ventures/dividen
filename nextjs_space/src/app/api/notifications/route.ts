import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

// GET /api/notifications — list notification rules
async function _GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;

    const rules = await prisma.notificationRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notifications — create a notification rule
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const body = await req.json();

    const { name, eventType, conditions, message, style, sound } = body;

    if (!name || !eventType || !message) {
      return NextResponse.json({ success: false, error: 'name, eventType, and message are required' }, { status: 400 });
    }

    const rule = await prisma.notificationRule.create({
      data: {
        userId,
        name,
        eventType,
        conditions: conditions ? JSON.stringify(conditions) : null,
        message,
        style: style || 'info',
        sound: sound || false,
      },
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
