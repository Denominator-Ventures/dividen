export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { withTelemetry } from '@/lib/telemetry';

// GET /api/admin/tasks — list ALL tasks across all users (admin only)
async function _GET(req: NextRequest) {
  try {
    { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }

    const tasks = await prisma.networkJob.findMany({
      include: {
        poster: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return NextResponse.json({ tasks });
  } catch (e: any) {
    console.error('Admin tasks error:', e);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
