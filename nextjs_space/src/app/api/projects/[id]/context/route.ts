export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assembleProjectContext, generateProjectDashboardMarkdown } from '@/lib/brief-assembly';
import { withTelemetry } from '@/lib/telemetry';

/**
 * GET /api/projects/:id/context
 * Returns the full cross-member project dashboard context.
 * Used by Divi's system prompt and by the UI for project overview.
 * ?format=markdown returns the Markdown dashboard string.
 */
async function _GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const ctx = await assembleProjectContext(params.id, userId);
    if (!ctx) return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });

    const { searchParams } = new URL(_req.url);
    if (searchParams.get('format') === 'markdown') {
      return NextResponse.json({ markdown: generateProjectDashboardMarkdown(ctx) });
    }

    return NextResponse.json(ctx);
  } catch (error: any) {
    console.error('GET /api/projects/:id/context error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withTelemetry(_GET);
