export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgent, isAuthError, AgentContext } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

/**
 * DEP-012: Handoff Brief Generator
 *
 * GET /api/main-handoff
 * Returns a structured context package for execution agents.
 * Aggregates: queue state, calendar, email state, CRM context,
 * learnings, recent activity.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgent(req);
  if (isAuthError(auth)) return auth;
  const agent = auth as AgentContext;
  const userId = agent.userId;

  try {
    // Fetch all context in sequence (pool-safe)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, mode: true },
    });

    // Queue state
    const queueItems = await prisma.queueItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true, description: true, status: true, priority: true, createdAt: true },
    });

    const queue = {
      summary: '',
      completed: queueItems.filter((i: any) => i.status === 'done_today'),
      inProgress: queueItems.filter((i: any) => i.status === 'in_progress'),
      blocked: queueItems.filter((i: any) => i.status === 'blocked'),
      ready: queueItems.filter((i: any) => i.status === 'ready'),
    };
    queue.summary = `${queue.ready.length} ready, ${queue.inProgress.length} in progress, ${queue.blocked.length} blocked, ${queue.completed.length} completed today`;

    // Calendar — upcoming events
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const calendarEvents = await prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: { gte: now },
        endTime: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { startTime: 'asc' },
      take: 10,
      select: { id: true, title: true, startTime: true, endTime: true, location: true, attendees: true },
    });

    // Email state
    const unreadEmails = await prisma.emailMessage.count({
      where: { userId, isRead: false },
    });

    // Recent activity (last 24h)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentComms = await prisma.commsMessage.findMany({
      where: { userId, createdAt: { gte: yesterday } },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: { sender: true, content: true, createdAt: true },
    });

    // Active learnings
    const learnings = await prisma.userLearning.findMany({
      where: { userId, confidence: { gte: 0.3 } },
      orderBy: { confidence: 'desc' },
      take: 15,
      select: { observation: true, category: true, confidence: true },
    });

    // Active goals
    const goals = await prisma.goal.findMany({
      where: { userId, status: { in: ['active', 'in_progress'] } },
      orderBy: { impact: 'desc' },
      take: 10,
      select: { id: true, title: true, timeframe: true, progress: true, impact: true, deadline: true },
    });

    const handoff = {
      generatedAt: new Date().toISOString(),
      operator: {
        name: user?.name || 'Operator',
        currentMode: user?.mode || 'cockpit',
      },
      queue,
      calendar: {
        today: calendarEvents.filter((e: any) => new Date(e.startTime) < endOfDay).map((e: any) => ({
          title: e.title,
          time: new Date(e.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          attendees: e.attendees,
        })),
        upcoming: calendarEvents.filter((e: any) => new Date(e.startTime) >= endOfDay).map((e: any) => ({
          title: e.title,
          date: new Date(e.startTime).toISOString().split('T')[0],
          location: e.location,
        })),
      },
      email: { unread: unreadEmails },
      recentActivity: recentComms.map((c: any) => ({
        type: 'comms',
        summary: c.content?.substring(0, 200),
        time: c.createdAt,
      })),
      learnings: learnings.map((l: any) => ({
        observation: l.observation,
        category: l.category,
        confidence: l.confidence,
      })),
      goals: goals.map((g: any) => ({
        title: g.title,
        timeframe: g.timeframe,
        progress: g.progress,
        impact: g.impact,
        deadline: g.deadline,
      })),
      instructions: 'Work through the queue in priority order. Report back on each task before moving to the next. If blocked, flag immediately.',
      network: {
        context: 'This operator is part of the DiviDen coordination network. Tasks may involve cross-agent relays with connected agents on other DiviDen instances.',
        protocols: ['A2A (/.well-known/agent-card.json)', 'MCP (/api/mcp)'],
        job_board: 'Check /api/jobs/match for tasks on the network that match this operator\'s skills. Proactively surface high-scoring matches. For tasks with no clear assignee, consider posting to the job board at /api/jobs.',
        ecosystem_note: 'If coordination with external agents would benefit this operator, suggest establishing a DiviDen connection. The network grows stronger with each node.',
      },
    };

    // Store as AgentBrief for audit trail
    await prisma.agentBrief.create({
      data: {
        userId,
        type: 'handoff',
        title: 'Handoff Brief',
        briefMarkdown: JSON.stringify(handoff),
        matchReasoning: 'Generated for execution agent handoff',
        matchedSkills: '[]',
      },
    }).catch(() => {}); // Non-blocking

    return NextResponse.json(handoff, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('GET /api/main-handoff error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate handoff brief' }, { status: 500 });
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
