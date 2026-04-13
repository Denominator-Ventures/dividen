/**
 * POST /api/queue/[id]/optimize
 * Triggers smart task re-optimization for a queue item.
 * Called by the UI after inline edits.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { optimizeTaskForAgent } from '@/lib/smart-task-prompter';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const item = await prisma.queueItem.findFirst({ where: { id: params.id, userId } });
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Run optimization (async but we await it here so the UI can poll for the result)
  await optimizeTaskForAgent(item.id, userId);

  // Return the updated item
  const updated = await prisma.queueItem.findUnique({ where: { id: params.id } });
  return NextResponse.json({ success: true, data: updated });
}
