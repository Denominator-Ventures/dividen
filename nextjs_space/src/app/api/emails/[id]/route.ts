import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const { id } = await params;

    const existing = await prisma.emailMessage.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Email not found' }, { status: 404 });
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};
    if (body.isRead !== undefined) updateData.isRead = body.isRead;
    if (body.isStarred !== undefined) updateData.isStarred = body.isStarred;
    if (body.labels !== undefined) updateData.labels = body.labels;
    if (body.linkedCardId !== undefined) updateData.linkedCardId = body.linkedCardId || null;
    if (body.linkedContactId !== undefined) updateData.linkedContactId = body.linkedContactId || null;

    const updated = await prisma.emailMessage.update({
      where: { id },
      data: updateData,
      include: {
        linkedCard: { select: { id: true, title: true, status: true } },
        linkedContact: { select: { id: true, name: true, company: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Emails PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update email' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const { id } = await params;

    const existing = await prisma.emailMessage.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Email not found' }, { status: 404 });
    }

    await prisma.emailMessage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Emails DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete email' }, { status: 500 });
  }
}
