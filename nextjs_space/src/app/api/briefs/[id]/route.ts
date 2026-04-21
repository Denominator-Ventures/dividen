export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

// GET: Get a single brief by ID
async function _GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const { id } = await params;

  const brief = await prisma.agentBrief.findFirst({
    where: { id, userId },
  });

  if (!brief) {
    return NextResponse.json({ success: false, error: 'Brief not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    brief: {
      ...brief,
      sourceContactIds: brief.sourceContactIds ? JSON.parse(brief.sourceContactIds) : [],
      matchedSkills: brief.matchedSkills ? JSON.parse(brief.matchedSkills) : [],
      createdAt: brief.createdAt.toISOString(),
      updatedAt: brief.updatedAt.toISOString(),
    },
  });
}

export const GET = withTelemetry(_GET);
