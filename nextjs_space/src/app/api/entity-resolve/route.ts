export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveEntity } from '@/lib/entity-resolution';

/**
 * FVP Brief Proposal #5: Universal Entity Resolution
 *
 * GET /api/entity-resolve?q=query&surfaces=contacts,cards&limit=20
 *
 * Resolves an entity (person, company, email) across all surfaces:
 * contacts, connections, cards, calendar events, emails, relays, team members.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query parameter "q" is required (min 2 chars)' }, { status: 400 });
    }

    const surfaces = searchParams.get('surfaces')?.split(',').filter(Boolean) || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const result = await resolveEntity(userId, query, { limit, surfaces });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('GET /api/entity-resolve error:', error);
    return NextResponse.json({ error: error.message || 'Entity resolution failed' }, { status: 500 });
  }
}
