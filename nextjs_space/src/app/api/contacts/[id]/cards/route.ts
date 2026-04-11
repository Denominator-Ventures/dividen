/**
 * Contact Linked Cards API — GET linked kanban cards for a contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const links = await prisma.cardContact.findMany({
    where: { contactId: params.id },
    include: {
      card: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          assignee: true,
          dueDate: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    data: links.map((l: any) => ({
      linkId: l.id,
      role: l.role,
      card: l.card,
    })),
  });
}
