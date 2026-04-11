/**
 * GET/POST/DELETE /api/contacts/[id]/relationships
 *
 * Manage relationships between contacts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  // Verify contact belongs to user
  const contact = await prisma.contact.findFirst({ where: { id: params.id, userId } });
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const [fromRels, toRels] = await Promise.all([
    prisma.contactRelationship.findMany({
      where: { fromId: params.id },
      include: { to: { select: { id: true, name: true, company: true, role: true, email: true } } },
    }),
    prisma.contactRelationship.findMany({
      where: { toId: params.id },
      include: { from: { select: { id: true, name: true, company: true, role: true, email: true } } },
    }),
  ]);

  const relationships = [
    ...fromRels.map((r: any) => ({ id: r.id, type: r.type, label: r.label, direction: 'outgoing', contact: r.to })),
    ...toRels.map((r: any) => ({ id: r.id, type: r.type, label: r.label, direction: 'incoming', contact: r.from })),
  ];

  return NextResponse.json({ success: true, data: relationships });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const body = await request.json();
  const { toId, type, label } = body;

  if (!toId || !type) {
    return NextResponse.json({ error: 'toId and type are required' }, { status: 400 });
  }

  // Verify both contacts belong to user
  const [fromContact, toContact] = await Promise.all([
    prisma.contact.findFirst({ where: { id: params.id, userId } }),
    prisma.contact.findFirst({ where: { id: toId, userId } }),
  ]);

  if (!fromContact || !toContact) {
    return NextResponse.json({ error: 'One or both contacts not found' }, { status: 404 });
  }

  try {
    const rel = await prisma.contactRelationship.create({
      data: {
        fromId: params.id,
        toId,
        type,
        label: label || null,
      },
      include: {
        to: { select: { id: true, name: true, company: true, role: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: rel.id, type: rel.type, label: rel.label, direction: 'outgoing', contact: rel.to },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Relationship already exists' }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const relId = searchParams.get('relId');

  if (!relId) {
    return NextResponse.json({ error: 'relId query param required' }, { status: 400 });
  }

  await prisma.contactRelationship.delete({ where: { id: relId } });

  return NextResponse.json({ success: true });
}
