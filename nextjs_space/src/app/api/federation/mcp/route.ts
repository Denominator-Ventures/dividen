export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * FVP Brief Proposal #8: Cross-Instance MCP Tool Invocation
 *
 * POST /api/federation/mcp — Execute MCP tools on behalf of a federated peer
 * GET  /api/federation/mcp — List available MCP tools for federation
 *
 * Auth: x-federation-token header
 *
 * This turns every DiviDen instance into a potential API for every other instance.
 * Trust boundaries are enforced by connection permissions.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-federation-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Tools that are safe to expose via federation (read-only or scoped)
const FEDERATION_ALLOWED_TOOLS = [
  'queue_list', 'contacts_search', 'cards_list',
  'mode_get', 'briefing_get', 'activity_recent',
  'job_browse', 'job_match', 'reputation_get',
  'relay_threads', 'entity_resolve',
];

// Tools that require elevated trust
const ELEVATED_TRUST_TOOLS = [
  'queue_add', 'queue_update', 'job_post',
  'relay_send', 'relay_thread_list',
];

async function validateFederation(req: NextRequest) {
  const federationToken = req.headers.get('x-federation-token');
  if (!federationToken) {
    return { error: NextResponse.json({ error: 'Missing federation token' }, { status: 401, headers: CORS_HEADERS }) };
  }

  const connection = await prisma.connection.findFirst({
    where: { isFederated: true, federationToken, status: 'active' },
  });
  if (!connection) {
    return { error: NextResponse.json({ error: 'Invalid federation token' }, { status: 403, headers: CORS_HEADERS }) };
  }

  // Parse trust level from permissions
  let trustLevel = 'restricted';
  try {
    const perms = JSON.parse(connection.permissions || '{}');
    trustLevel = perms.trustLevel || 'restricted';
  } catch {}

  // Determine the local user this connection maps to
  const localUserId = connection.requesterId || connection.accepterId;
  if (!localUserId) {
    return { error: NextResponse.json({ error: 'No local user for this connection' }, { status: 500, headers: CORS_HEADERS }) };
  }

  return { connection, trustLevel, localUserId };
}

/**
 * GET — List MCP tools available via federation for this connection
 */
export async function GET(req: NextRequest) {
  const auth = await validateFederation(req);
  if ('error' in auth) return auth.error;
  const { trustLevel } = auth;

  const availableTools = [...FEDERATION_ALLOWED_TOOLS];
  if (trustLevel === 'full_auto' || trustLevel === 'supervised') {
    availableTools.push(...ELEVATED_TRUST_TOOLS);
  }

  return NextResponse.json(
    {
      tools: availableTools,
      trustLevel,
      note: trustLevel === 'restricted'
        ? 'This connection has restricted trust. Only read-only tools are available. Upgrade trust level for write access.'
        : 'Full tool access granted based on connection trust level.',
    },
    { headers: CORS_HEADERS },
  );
}

/**
 * POST — Execute an MCP tool via federation
 */
export async function POST(req: NextRequest) {
  const auth = await validateFederation(req);
  if ('error' in auth) return auth.error;
  const { trustLevel, localUserId, connection } = auth;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS });
  }

  const { tool, arguments: args } = body;
  if (!tool) {
    return NextResponse.json({ error: 'tool name required' }, { status: 400, headers: CORS_HEADERS });
  }

  // Check if tool is allowed at this trust level
  const allAllowed = [...FEDERATION_ALLOWED_TOOLS];
  if (trustLevel === 'full_auto' || trustLevel === 'supervised') {
    allAllowed.push(...ELEVATED_TRUST_TOOLS);
  }
  if (!allAllowed.includes(tool)) {
    return NextResponse.json(
      { error: `Tool "${tool}" not available at trust level "${trustLevel}"` },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  // Forward to the local MCP endpoint internally
  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${proto}://${host}`;

    // Get an API key for the local user to authenticate
    const apiKey = await prisma.agentApiKey.findFirst({
      where: { userId: localUserId, isActive: true },
    });
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No active API key for local user. Generate one in Settings.' },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const mcpResponse = await fetch(`${baseUrl}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.apiKey}`,
      },
      body: JSON.stringify({
        method: 'tools/call',
        params: { name: tool, arguments: args || {} },
      }),
      signal: AbortSignal.timeout(15000),
    });

    const result = await mcpResponse.json();

    // Log the federated tool invocation
    await prisma.activityLog.create({
      data: {
        action: 'federation_mcp_call',
        actor: 'federation',
        summary: `Federated MCP call: ${tool} from ${connection.peerInstanceUrl || 'connected instance'}`,
        metadata: JSON.stringify({ tool, connectionId: connection.id, trustLevel }),
        userId: localUserId,
      },
    }).catch(() => {}); // Fire-and-forget

    return NextResponse.json(
      {
        tool,
        result: result.content || result,
        executedBy: localUserId,
        trustLevel,
      },
      { headers: CORS_HEADERS },
    );
  } catch (error: any) {
    console.error('POST /api/federation/mcp error:', error);
    return NextResponse.json(
      { error: error.message || 'MCP tool execution failed' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
