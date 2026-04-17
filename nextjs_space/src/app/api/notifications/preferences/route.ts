import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parsePrefs, DEFAULT_PREFS, type NotificationPrefs } from '@/lib/notification-prefs';

export const dynamic = 'force-dynamic';

/** GET /api/notifications/preferences */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } });
    const prefs = parsePrefs(user?.notificationPrefs);
    return NextResponse.json({ success: true, data: prefs });
  } catch (error) {
    console.error('Notification prefs GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}

/** PUT /api/notifications/preferences */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const body = await req.json();

    const prefs: NotificationPrefs = {
      enabled: body.enabled ?? true,
      categories: { ...DEFAULT_PREFS.categories, ...(body.categories || {}) },
    };

    await prisma.user.update({
      where: { id: userId },
      data: { notificationPrefs: JSON.stringify(prefs) },
    });

    return NextResponse.json({ success: true, data: prefs });
  } catch (error) {
    console.error('Notification prefs PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
