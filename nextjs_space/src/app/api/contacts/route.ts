/**
 * Contacts API — GET (list), POST (create)
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
  const search = url.searchParams.get('search') || '';
  const tag = url.searchParams.get('tag') || '';
  const sortField = url.searchParams.get('sort') || 'updatedAt';
  const sortOrder = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const limitParam = url.searchParams.get('limit');
  const take = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 200) : undefined;

  const where: any = { userId: user.id };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
      { role: { contains: search } },
    ];
  }

  if (tag) {
    where.tags = { contains: tag };
  }

  const allowedSortFields = ['updatedAt', 'createdAt', 'name'];
  const orderByField = allowedSortFields.includes(sortField) ? sortField : 'updatedAt';

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { [orderByField]: sortOrder },
    ...(take ? { take } : {}),
    include: {
      cards: {
        include: {
          card: { select: { id: true, title: true, status: true } },
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: contacts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  const body = await req.json();

  if (!body.name) {
    return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      company: body.company || null,
      role: body.role || null,
      notes: body.notes || null,
      tags: body.tags || null,
      source: body.source || 'manual',
      userId: user.id,
    },
  });

  return NextResponse.json({ success: true, data: contact }, { status: 201 });
}
