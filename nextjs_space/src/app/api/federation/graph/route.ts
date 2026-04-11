/**
 * Federation Graph Topology API
 * FVP Proposal #12
 *
 * GET — get serendipity matches for the authenticated user
 * POST — export anonymized graph topology for federation exchange
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  findSerendipityMatches,
  exportGraphTopology,
} from '@/lib/federation/graph-matching';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const matches = await findSerendipityMatches(userId);

  return NextResponse.json({
    matches,
    generatedAt: new Date().toISOString(),
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const topology = await exportGraphTopology(userId);

  return NextResponse.json({
    topology,
    generatedAt: new Date().toISOString(),
  });
}
