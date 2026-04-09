export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgent, isAuthError, AgentContext } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

/**
 * DEP-010: MCP (Model Context Protocol) Server Endpoint
 *
 * POST /api/mcp — Execute MCP tool calls
 * GET  /api/mcp — List available tools
 *
 * Allows external AI tools (Claude Desktop, Cursor, etc.) to interact
 * with DiviDen's capabilities via the MCP standard.
 */

// ── Tool Definitions ──

const TOOLS = [
  {
    name: 'queue_list',
    description: 'List queue items. Optionally filter by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ready', 'in_progress', 'done_today', 'blocked'],
          description: 'Filter by status. Omit for all items.',
        },
      },
    },
  },
  {
    name: 'queue_add',
    description: 'Add a new item to the task queue.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
      },
      required: ['title'],
    },
  },
  {
    name: 'queue_update',
    description: 'Update a queue item\'s status, priority, or description.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Queue item ID' },
        status: { type: 'string', enum: ['ready', 'in_progress', 'done_today', 'blocked'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        description: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'contacts_list',
    description: 'List all CRM contacts.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'contacts_search',
    description: 'Search contacts by name or company.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'cards_list',
    description: 'List kanban cards, optionally filtered by stage.',
    inputSchema: {
      type: 'object',
      properties: {
        stage: { type: 'string', description: 'Filter by pipeline stage' },
      },
    },
  },
  {
    name: 'mode_get',
    description: 'Get the current operating mode (cockpit or chief_of_staff).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'briefing_get',
    description: 'Get a briefing summary with queue, calendar, and goals.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'activity_recent',
    description: 'Get recent activity log entries.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of entries (default 20)' },
      },
    },
  },
];

// ── Tool Execution ──

async function executeTool(toolName: string, args: any, userId: string) {
  switch (toolName) {
    case 'queue_list': {
      const where: any = { userId };
      if (args.status) where.status = args.status;
      const items = await prisma.queueItem.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: 50,
        select: { id: true, title: true, description: true, status: true, priority: true, createdAt: true },
      });
      return items;
    }

    case 'queue_add': {
      const item = await prisma.queueItem.create({
        data: {
          type: 'task',
          title: args.title,
          description: args.description || null,
          priority: args.priority || 'medium',
          status: 'ready',
          source: 'mcp',
          userId,
        },
      });
      return { id: item.id, title: item.title, status: item.status };
    }

    case 'queue_update': {
      const item = await prisma.queueItem.findFirst({ where: { id: args.id, userId } });
      if (!item) return { error: 'Queue item not found' };
      const data: any = {};
      if (args.status) data.status = args.status;
      if (args.priority) data.priority = args.priority;
      if (args.description) data.description = args.description;
      const updated = await prisma.queueItem.update({ where: { id: args.id }, data });
      return { id: updated.id, title: updated.title, status: updated.status };
    }

    case 'contacts_list': {
      const contacts = await prisma.contact.findMany({
        where: { userId },
        take: 100,
        select: { id: true, name: true, email: true, company: true, tags: true },
      });
      return contacts;
    }

    case 'contacts_search': {
      const contacts = await prisma.contact.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: args.query, mode: 'insensitive' } },
            { company: { contains: args.query, mode: 'insensitive' } },
            { email: { contains: args.query, mode: 'insensitive' } },
          ],
        },
        take: 20,
        select: { id: true, name: true, email: true, company: true, tags: true },
      });
      return contacts;
    }

    case 'cards_list': {
      const where: any = { userId };
      if (args.stage) where.status = args.stage;
      const cards = await prisma.kanbanCard.findMany({
        where,
        orderBy: { order: 'asc' },
        take: 50,
        select: { id: true, title: true, status: true, priority: true, assignee: true, dueDate: true },
      });
      return cards;
    }

    case 'mode_get': {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { mode: true } });
      return { mode: user?.mode || 'cockpit' };
    }

    case 'briefing_get': {
      const queueCounts = await prisma.queueItem.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      });
      const goals = await prisma.goal.findMany({
        where: { userId, status: { in: ['active', 'in_progress'] } },
        take: 5,
        select: { title: true, progress: true, impact: true },
      });
      const now = new Date();
      const nextEvents = await prisma.calendarEvent.findMany({
        where: { userId, startTime: { gte: now } },
        orderBy: { startTime: 'asc' },
        take: 3,
        select: { title: true, startTime: true },
      });
      return {
        queue: Object.fromEntries(queueCounts.map(g => [g.status, g._count])),
        goals,
        nextEvents: nextEvents.map(e => ({ title: e.title, time: e.startTime })),
      };
    }

    case 'activity_recent': {
      const limit = Math.min(args.limit || 20, 50);
      const comms = await prisma.commsMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { sender: true, content: true, createdAt: true },
      });
      return comms.map(c => ({ sender: c.sender, content: c.content?.substring(0, 200), time: c.createdAt }));
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Route Handlers ──

export async function POST(req: NextRequest) {
  const auth = await authenticateAgent(req);
  if (isAuthError(auth)) return auth;
  const agent = auth as AgentContext;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { method, params } = body;

  try {
    // MCP standard: tools/list
    if (method === 'tools/list') {
      return NextResponse.json({ tools: TOOLS });
    }

    // MCP standard: tools/call
    if (method === 'tools/call') {
      const { name, arguments: args } = params || {};
      if (!name) return NextResponse.json({ error: 'Tool name is required' }, { status: 400 });

      const tool = TOOLS.find(t => t.name === name);
      if (!tool) return NextResponse.json({ error: `Unknown tool: ${name}` }, { status: 400 });

      const result = await executeTool(name, args || {}, agent.userId);
      return NextResponse.json({
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      });
    }

    return NextResponse.json({ error: `Unknown MCP method: ${method}` }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/mcp error:', error);
    return NextResponse.json({ error: error.message || 'MCP execution failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'DiviDen MCP Server',
    version: '1.0.0',
    description: 'Model Context Protocol endpoint for DiviDen. Exposes queue, CRM, kanban, and context tools.',
    tools: TOOLS,
    authentication: {
      type: 'bearer',
      description: 'Use a DiviDen API key as Bearer token.',
    },
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
