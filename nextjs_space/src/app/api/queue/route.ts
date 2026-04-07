/**
 * GET /api/queue - List queue items
 * POST /api/queue - Create queue item
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const items = await prisma.queueItem.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ success: true, data: items });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();

  const { title, description, type = 'task', priority = 'medium', status = 'ready', source = 'user', metadata } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const item = await prisma.queueItem.create({
    data: {
      title,
      description: description || null,
      type,
      priority,
      status,
      source,
      userId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  return NextResponse.json({ success: true, data: item }, { status: 201 });
}
