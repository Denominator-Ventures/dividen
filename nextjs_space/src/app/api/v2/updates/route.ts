export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UPDATES } from '@/lib/updates';

/**
 * GET /api/v2/updates — Public unified updates feed.
 * Self-hosted instances and os.dividen.ai can pull this to stay in sync.
 *
 * Query params:
 *   ?limit=N    — return at most N entries (default 50)
 *   ?since=ISO  — return entries newer than this date
 *   ?tag=X      — filter by tag
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const since = searchParams.get('since');
    const tag = searchParams.get('tag');

    let entries = [...UPDATES];

    // Filter by date
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        entries = entries.filter(u => new Date(u.date) > sinceDate);
      }
    }

    // Filter by tag
    if (tag) {
      entries = entries.filter(u => u.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
    }

    // Apply limit
    entries = entries.slice(0, limit);

    return NextResponse.json({
      updates: entries,
      total: UPDATES.length,
      returned: entries.length,
      source: 'dividen.ai',
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    console.error('GET /api/v2/updates error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
