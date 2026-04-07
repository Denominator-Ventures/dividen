import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const VALID_STATES = ['new', 'read', 'acknowledged', 'resolved', 'dismissed'];

// PATCH /api/comms/[id] — update message state or content
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
    const body = await req.json();
    const { state, content, priority } = body;

    // Verify ownership
    const existing = await prisma.commsMessage.findFirst({
      where: { id, userId: userId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (state && VALID_STATES.includes(state)) {
      updateData.state = state;
    }
    if (content !== undefined) {
      updateData.content = content;
    }
    if (priority) {
      updateData.priority = priority;
    }

    const updated = await prisma.commsMessage.update({
      where: { id },
      data: updateData,
      include: {
        linkedCard: { select: { id: true, title: true, status: true } },
        linkedContact: { select: { id: true, name: true, company: true } },
        linkedRecording: { select: { id: true, title: true } },
        linkedDocument: { select: { id: true, title: true, type: true } },
      },
    });

    // Log state changes
    if (state && state !== existing.state) {
      await prisma.activityLog.create({
        data: {
          action: 'comms_state_changed',
          actor: 'user',
          summary: `Comms message marked as ${state}`,
          metadata: JSON.stringify({ messageId: id, from: existing.state, to: state }),
          userId: userId,
        },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Comms PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update message' }, { status: 500 });
  }
}

// DELETE /api/comms/[id]
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

    const existing = await prisma.commsMessage.findFirst({
      where: { id, userId: userId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
    }

    await prisma.commsMessage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Comms DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete message' }, { status: 500 });
  }
}
