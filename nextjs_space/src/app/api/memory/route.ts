/**
 * Memory API — GET (list by tier), POST (create)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

async function _GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const url = new URL(req.url);
  const tierParam = url.searchParams.get('tier');
  const search = url.searchParams.get('search') || '';

  const where: any = { userId: userId };

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

async function _POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

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
      userId: userId,
    },
  });

  return NextResponse.json({ success: true, data: item }, { status: 201 });
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
