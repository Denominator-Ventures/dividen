/**
 * Memory Approve/Reject API — POST to approve or reject a Tier 3 pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

async function _POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const approved = body.approved === true;

  const userId = (session.user as any).id;
  const item = await prisma.memoryItem.findFirst({ where: { id: params.id, userId } });
  if (!item) {
    return NextResponse.json({ success: false, error: 'Memory item not found' }, { status: 404 });
  }

  if (item.tier !== 3) {
    return NextResponse.json({ success: false, error: 'Only Tier 3 patterns can be approved/rejected' }, { status: 400 });
  }

  const updated = await prisma.memoryItem.update({
    where: { id: params.id },
    data: {
      approved,
      // Boost confidence when approved, lower when rejected
      confidence: approved
        ? Math.min(1.0, (item.confidence || 0.5) + 0.1)
        : Math.max(0, (item.confidence || 0.5) - 0.2),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export const POST = withTelemetry(_POST);
