/**
 * Memory API — GET (list by tier), POST (create)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  const url = new URL(req.url);
  const tierParam = url.searchParams.get('tier');
  const search = url.searchParams.get('search') || '';

  const where: any = { userId: user.id };

  if (tierParam) {
    where.tier = parseInt(tierParam, 10);
  }

  if (search) {
    where.OR = [
      { key: { contains: search } },
      { value: { contains: search } },
    ];
  }

  const items = await prisma.memoryItem.findMany({
    where,
    orderBy: [{ tier: 'asc' }, { pinned: 'desc' }, { updatedAt: 'desc' }],
  });

  return NextResponse.json({ success: true, data: items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  const body = await req.json();

  if (!body.key || !body.value) {
    return NextResponse.json({ success: false, error: 'Key and value are required' }, { status: 400 });
  }

  const tier = body.tier || 1;

  const item = await prisma.memoryItem.create({
    data: {
      tier,
      category: body.category || (tier === 1 ? 'general' : tier === 2 ? 'workflow' : 'preference'),
      key: body.key,
      value: body.value,
      scope: body.scope || null,
      pinned: body.pinned || false,
      priority: body.priority || null,
      confidence: body.confidence ?? (tier === 3 ? 0.5 : null),
      approved: tier === 3 ? null : undefined,
      source: body.source || 'user',
      userId: user.id,
    },
  });

  return NextResponse.json({ success: true, data: item }, { status: 201 });
}
