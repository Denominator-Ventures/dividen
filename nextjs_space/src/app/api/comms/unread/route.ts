import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/comms/unread — get unread count
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;

    const count = await prisma.commsMessage.count({
      where: {
        userId: userId,
        state: 'new',
      },
    });

    return NextResponse.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Comms unread count error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch count' }, { status: 500 });
  }
}
