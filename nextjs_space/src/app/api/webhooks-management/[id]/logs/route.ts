import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Get webhook logs
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  // Verify webhook belongs to user
  const webhook = await prisma.webhook.findFirst({
    where: { id: params.id, userId: userId },
  });
  if (!webhook) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const logs = await prisma.webhookLog.findMany({
    where: { webhookId: params.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ success: true, data: logs });
}
