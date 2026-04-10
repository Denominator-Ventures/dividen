export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /.well-known/mcp/server-card.json
 *
 * MCP Server Card — static metadata about this MCP server.
 * Used by registries (Smithery, etc.) and clients for pre-connection discovery.
 * Per SEP-1649 / Smithery publish docs.
 *
 * This is the fallback when OAuth discovery fails (our server uses
 * API key bearer auth, not OAuth).
 */
export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'dividen.ai';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${proto}://${host}`;

  const serverCard = {
    $schema: 'https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json',
    version: '1.0.0',
    protocolVersion: '2025-03-26',

    serverInfo: {
      name: 'DiviDen MCP Server',
      version: '1.1.0',
    },

    description:
      'Open coordination network for AI agents and their humans. ' +
      '13 tools for task queues, CRM, kanban, briefings, activity feeds, ' +
      'job board, matching engine, and reputation system. ' +
      'Dual-protocol: MCP + A2A. MIT licensed, self-hostable.',

    iconUrl: `${baseUrl}/icon-512.png`,
    documentationUrl: 'https://os.dividen.ai/docs',

    transport: {
      type: 'streamable-http',
      endpoint: '/api/mcp',
    },

    authentication: {
      required: true,
      schemes: ['bearer'],
    },

    capabilities: {
      tools: { listChanged: false },
      prompts: null,
      resources: null,
    },

    // Static tool list so registries can index without connecting
    tools: [
      {
        name: 'queue_list',
        description: 'List items in the operator\'s task queue. Filter by status (ready, in_progress, done_today, blocked).',
      },
      {
        name: 'queue_add',
        description: 'Add a new item to the task queue.',
      },
      {
        name: 'queue_update',
        description: 'Update a queue item\'s status, priority, or description.',
      },
      {
        name: 'contacts_list',
        description: 'List all CRM contacts for the operator.',
      },
      {
        name: 'contacts_search',
        description: 'Search contacts by name, email, or company.',
      },
      {
        name: 'cards_list',
        description: 'List kanban cards, optionally filtered by pipeline stage.',
      },
      {
        name: 'mode_get',
        description: 'Get the current operating mode (cockpit or chief_of_staff).',
      },
      {
        name: 'briefing_get',
        description: 'Get a briefing with queue state, upcoming calendar, and active goals.',
      },
      {
        name: 'activity_recent',
        description: 'Get recent activity log entries.',
      },
      {
        name: 'job_post',
        description: 'Post a new task to the DiviDen network job board.',
      },
      {
        name: 'job_browse',
        description: 'Browse open jobs on the network job board.',
      },
      {
        name: 'job_match',
        description: 'Find jobs matching the operator\'s profile via skill overlap, task type, availability, and reputation.',
      },
      {
        name: 'reputation_get',
        description: 'Get the operator\'s network reputation score and reviews.',
      },
    ],
  };

  return NextResponse.json(serverCard, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600',
    },
  });
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
