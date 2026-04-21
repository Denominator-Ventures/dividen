/**
 * POST /api/queue/dispatch - Dispatch the next READY item to IN_PROGRESS
 * Respects operating mode:
 *   - Chief of Staff: only one IN_PROGRESS at a time
 *   - Cockpit: multiple IN_PROGRESS allowed
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { dispatchNextItem } from '@/lib/queue-dispatch';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

async function _POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  // Get user's operating mode
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mode: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const result = await dispatchNextItem(userId, user.mode as 'cockpit' | 'chief_of_staff');

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 409 });
  }

  return NextResponse.json({ success: true, data: result.item });
}

export const POST = withTelemetry(_POST);
