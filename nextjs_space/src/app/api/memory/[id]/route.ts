/**
 * Single Memory Item API — PATCH (update), DELETE (delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

async function _PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const existing = await prisma.memoryItem.findFirst({ where: { id: params.id, userId } });
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Memory item not found' }, { status: 404 });
  }

  const body = await req.json();
  const updateData: any = {};

  const fields = ['key', 'value', 'category', 'scope', 'pinned', 'priority', 'confidence', 'approved'];
  for (const field of fields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  const item = await prisma.memoryItem.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json({ success: true, data: item });
}

async function _DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const existing = await prisma.memoryItem.findFirst({ where: { id: params.id, userId } });
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Memory item not found' }, { status: 404 });
  }
  await prisma.memoryItem.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}

export const PATCH = withTelemetry(_PATCH);
export const DELETE = withTelemetry(_DELETE);
