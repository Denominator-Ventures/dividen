export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/tasks — list ALL tasks across all users (admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ') || auth.split(' ')[1] !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
