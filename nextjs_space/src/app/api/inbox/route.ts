export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const [messages, total, unreadCount] = await Promise.all([
      prisma.emailMessage.findMany({
        where: { userId },
        orderBy: { receivedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          subject: true,
          fromName: true,
          fromEmail: true,
          snippet: true,
          isRead: true,
          isStarred: true,
          labels: true,
          receivedAt: true,
        },
      }),
      prisma.emailMessage.count({ where: { userId } }),
      prisma.emailMessage.count({ where: { userId, isRead: false } }),
    ]);

    return NextResponse.json({
      data: {
        messages,
        total,
        unreadCount,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('[/api/inbox] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
