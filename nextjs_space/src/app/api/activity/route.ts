import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const activities = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ success: true, data: activities });
}
