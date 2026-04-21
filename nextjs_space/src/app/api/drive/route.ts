export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

async function _GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const [files, total] = await Promise.all([
      prisma.document.findMany({
        where: {
          userId,
          fileSource: { not: 'local' }, // Only external drive files, not local notes
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          type: true,
          url: true,
          fileSource: true,
          mimeType: true,
          fileSize: true,
          thumbnailUrl: true,
          accountEmail: true,
          updatedAt: true,
        },
      }),
      prisma.document.count({
        where: {
          userId,
          fileSource: { not: 'local' },
        },
      }),
    ]);

    return NextResponse.json({
      data: {
        files,
        total,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('[/api/drive] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
