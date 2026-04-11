/**
 * Federation Task Routing API
 * FVP Proposal #14
 *
 * POST — route a task to the best candidate in the network
 * GET  — get routing intelligence digest
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  routeTask,
  getRoutingIntelligenceDigest,
} from '@/lib/federation/task-routing';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const digest = await getRoutingIntelligenceDigest(userId);

  return NextResponse.json({ digest });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const body = await req.json();
    const { taskDescription, taskSkills, taskType, maxCandidates } = body;

    if (!taskDescription) {
      return NextResponse.json({ error: 'taskDescription required' }, { status: 400 });
    }

    const decision = await routeTask(
      userId,
      taskDescription,
      taskSkills || [],
      taskType || null,
      maxCandidates || 5
    );

    return NextResponse.json(decision);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
