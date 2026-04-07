/**
 * Memory Pin Toggle API — POST to toggle pinned status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const item = await prisma.memoryItem.findFirst({ where: { id: params.id, userId } });
  if (!item) {
    return NextResponse.json({ success: false, error: 'Memory item not found' }, { status: 404 });
  }

  const updated = await prisma.memoryItem.update({
    where: { id: params.id },
    data: { pinned: !item.pinned },
  });

  return NextResponse.json({ success: true, data: updated });
}
