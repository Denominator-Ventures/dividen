import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PATCH - Update a service API key
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const existing = await prisma.serviceApiKey.findFirst({
    where: { id: params.id, userId: userId },
  });
  if (!existing) return NextResponse.json({ error: 'Key not found' }, { status: 404 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updateData: any = {};
  if (body.keyName !== undefined) updateData.keyName = body.keyName;
  if (body.keyValue !== undefined) updateData.keyValue = body.keyValue;
  if (body.service !== undefined) updateData.service = body.service;

  const key = await prisma.serviceApiKey.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json({
    success: true,
    data: {
      id: key.id,
      service: key.service,
      keyName: key.keyName,
      keyHint: '••••' + key.keyValue.slice(-4),
    },
  });
}

// DELETE - Remove a service API key
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const existing = await prisma.serviceApiKey.findFirst({
    where: { id: params.id, userId: userId },
  });
  if (!existing) return NextResponse.json({ error: 'Key not found' }, { status: 404 });

  await prisma.serviceApiKey.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
