export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgent, isAuthError, AgentContext } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

/**
 * DEP-011: Operational Playbook Endpoint
 *
 * GET /api/a2a/playbook
 * Returns machine-readable operating instructions for a connected agent.
 * Includes: endpoints, reporting conventions, behavioral expectations,
 * user preferences from learnings, and current queue state.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgent(req);
  if (isAuthError(auth)) return auth;
  const agent = auth as AgentContext;
  const userId = agent.userId;

  try {
    // Fetch user context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, mode: true },
    });

    // Fetch profile preferences
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { headline: true, skills: true },
    });

    // Fetch active learnings for behavioral preferences
    const learnings = await prisma.userLearning.findMany({
      where: { userId, confidence: { gte: 0.3 } },
      orderBy: { confidence: 'desc' },
      take: 20,
      select: { observation: true, category: true, confidence: true },
    });

    // Get queue state
    const queueCounts = await prisma.queueItem.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    });

    const queueState: Record<string, number> = {};
    for (const g of queueCounts) {
      queueState[g.status] = g._count;
    }

    // Get current in-progress task
    const inProgressTask = await prisma.queueItem.findFirst({
      where: { userId, status: 'in_progress' },
      select: { id: true, title: true, description: true },
    });

    // Build preferences from learnings
    const preferences = learnings
      .filter(l => ['communication_style', 'workflow_pattern', 'delegation'].includes(l.category || ''))
      .map(l => l.observation)
      .join('. ') || 'Direct, action-oriented. No preamble.';

    // Get connection trust level
    const connection = await prisma.connection.findFirst({
      where: {
        status: 'active',
        OR: [{ requesterId: userId, accepterId: userId }],
      },
      select: { permissions: true },
    });

    let trustLevel = 'supervised';
    try {
      const perms = JSON.parse(connection?.permissions || '{}');
      trustLevel = perms.trustLevel || 'supervised';
    } catch {}

    // Build the playbook
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${proto}://${host}`;

    const playbook = {
      version: '2.1',
      instanceName: 'DiviDen',
      operator: {
        name: user?.name || 'Operator',
        preferences,
      },
      endpoints: {
        tasks_respond: {
          method: 'POST',
          url: `${baseUrl}/api/a2a`,
          description: 'Report task completion or results',
          payload: {
            jsonrpc: '2.0',
            method: 'tasks/respond',
            params: {
              relayId: '<from dispatch>',
              status: 'completed | blocked | in_progress',
              result: '<summary of what was done>',
            },
          },
        },
        tasks_send: {
          method: 'POST',
          url: `${baseUrl}/api/a2a`,
          description: 'Send a new task or relay',
          payload: {
            jsonrpc: '2.0',
            method: 'tasks/send',
            params: {
              intent: 'assign_task | get_info | update_status',
              subject: '<task title>',
              payload: '<task details>',
            },
          },
        },
        handoff: {
          method: 'GET',
          url: `${baseUrl}/api/main-handoff`,
          description: 'Get current handoff brief with full context',
        },
      },
      reporting: {
        onCompletion: 'Call tasks/respond with status "completed" and a brief result summary',
        onBlocked: 'Call tasks/respond with status "blocked" and explain what\'s blocking',
        onProgress: 'Optional: call tasks/respond with status "in_progress" for long-running tasks',
        format: 'Keep results concise. Lead with outcome, then details.',
      },
      behavior: {
        executionMode: 'sequential',
        autonomyLevel: trustLevel,
        communicationStyle: preferences,
        errorHandling: 'Report blocked status with clear reason. Don\'t retry silently.',
      },
      context: {
        currentMode: user?.mode || 'cockpit',
        queueDepth: queueState['ready'] || 0,
        inProgressTask: inProgressTask
          ? { id: inProgressTask.id, title: inProgressTask.title }
          : null,
        queueSummary: queueState,
      },
    };

    return NextResponse.json(playbook, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('GET /api/a2a/playbook error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate playbook' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
