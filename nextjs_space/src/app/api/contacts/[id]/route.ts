/**
 * Single Contact API — GET, PATCH, DELETE
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

async function _GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, userId },
    include: {
      cards: {
        include: {
          card: { select: { id: true, title: true, status: true, priority: true } },
        },
      },
    },
  });

  if (!contact) {
    return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: contact });
}

async function _PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const existing = await prisma.contact.findFirst({ where: { id: params.id, userId } });
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }

  const body = await req.json();
  const updateData: any = {};

  const fields = ['name', 'email', 'phone', 'company', 'role', 'notes', 'tags'];
  for (const field of fields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: updateData,
  });

  logActivity({ userId, action: 'contact_updated', summary: `Updated contact "${contact.name}"`, metadata: { contactId: contact.id, fields: Object.keys(updateData) } });

  return NextResponse.json({ success: true, data: contact });
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
  const existing = await prisma.contact.findFirst({ where: { id: params.id, userId } });
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }
  await prisma.contact.delete({ where: { id: params.id } });

  logActivity({ userId, action: 'contact_deleted', summary: `Deleted contact "${existing.name}"`, metadata: { contactId: params.id } });

  return NextResponse.json({ success: true });
}

export const GET = withTelemetry(_GET);
export const PATCH = withTelemetry(_PATCH);
export const DELETE = withTelemetry(_DELETE);
