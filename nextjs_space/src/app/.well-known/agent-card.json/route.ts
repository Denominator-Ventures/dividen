export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /.well-known/agent-card.json
 * 
 * A2A (Agent-to-Agent) Protocol — Agent Card
 * Publishes this DiviDen instance's capabilities as a discoverable agent.
 * 
 * Per Google A2A spec: agent cards advertise name, capabilities, skills,
 * supported modalities, authentication, and service endpoint.
 * 
 * This is a PUBLIC endpoint — no auth required.
 * It's how other agents discover this instance.
 */
export async function GET(req: NextRequest) {
  try {
    // Get instance configuration
    const fedConfig = await prisma.federationConfig.findFirst();
    const instanceName = fedConfig?.instanceName || 'DiviDen';
    
    // Derive the instance URL from request headers (works in all environments)
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = fedConfig?.instanceUrl || `${proto}://${host}`;

    // Count active users and connections to show instance health
    const [userCount, connectionCount] = await Promise.all([
      prisma.user.count(),
      prisma.connection.count({ where: { status: 'active' } }),
    ]);

    const agentCard = {
      // === A2A Standard Fields ===
      name: instanceName,
      description: `${instanceName} — A DiviDen instance. Personal AI agent coordination hub supporting the DiviDen Agentic Working Protocol (DAWP). Handles structured agent relays, profile-based routing, and federated cross-instance collaboration.`,
      url: `${baseUrl}/api/a2a`,
      version: '0.1.0',
      protocol: 'a2a',
      protocolVersion: '0.2',
      
      // === Provider ===
      provider: {
        organization: 'DiviDen',
        url: 'https://dividen.ai',
      },

      // === Capabilities ===
      capabilities: {
        streaming: true,           // SSE support for relay updates
        pushNotifications: true,   // DEP-008: Webhook push for agent events
        stateTransitionHistory: true, // Relay lifecycle tracking
      },

      // === Skills (what this agent can do) ===
      skills: [
        {
          id: 'relay',
          name: 'Agent Relay',
          description: 'Send and receive structured coordination messages (relays) with classified intent, priority, and lifecycle tracking. Supports request, response, notification, and update types.',
          tags: ['coordination', 'messaging', 'relay'],
          examples: [
            'Send a relay requesting project status from a connected agent',
            'Respond to an inbound task assignment relay',
            'Send a notification update about a deadline change',
          ],
        },
        {
          id: 'profile',
          name: 'Profile & Routing',
          description: 'Query agent profiles for skills, lived experience, task types, and availability. Used for intelligent routing — matching requests to the best-suited human based on capabilities and understanding, not just job title.',
          tags: ['profile', 'routing', 'discovery'],
          examples: [
            'Find a connected agent whose human speaks Japanese and has lived in Japan',
            'Check availability and capacity of a connected agent',
            'Query task types to find someone suited for mentoring',
          ],
        },
        {
          id: 'connection',
          name: 'Connection Management',
          description: 'Establish, manage, and query bilateral agent connections with configurable trust levels and permission scopes. Supports local and federated (cross-instance) connections.',
          tags: ['connections', 'federation', 'trust'],
          examples: [
            'List active connections and their trust levels',
            'Accept a pending connection request',
            'Update permission scopes for a connection',
          ],
        },
        {
          id: 'schedule',
          name: 'Scheduling',
          description: 'Coordinate meeting times based on calendar availability and timezone awareness.',
          tags: ['calendar', 'scheduling', 'timezone'],
          examples: [
            'Find mutual availability between two connected agents',
          ],
        },
        {
          id: 'task',
          name: 'Task Management',
          description: 'Manage task queues, dispatch work items, and track completion status.',
          tags: ['tasks', 'queue', 'workflow'],
          examples: [
            'Create a task from a relay request',
            'Check pending queue items',
          ],
        },
      ],

      // === Input/Output Modalities ===
      defaultInputModes: ['application/json', 'text/plain'],
      defaultOutputModes: ['application/json', 'text/plain'],

      // === Authentication ===
      authentication: {
        schemes: ['bearer'],
        description: 'Bearer token authentication using DiviDen API keys. Generate keys from Settings → API Keys in the DiviDen interface.',
        credentials: {
          headerName: 'Authorization',
          headerValuePrefix: 'Bearer ',
          tokenPrefix: 'dvd_',
        },
      },

      // === Service Endpoints ===
      endpoints: {
        a2a: `${baseUrl}/api/a2a`,
        mcp: `${baseUrl}/api/mcp`,
        connect: `${baseUrl}/api/main-connect`,
        disconnect: `${baseUrl}/api/main-disconnect`,
        playbook: `${baseUrl}/api/a2a/playbook`,
        handoff: `${baseUrl}/api/main-handoff`,
        federation: {
          connect: `${baseUrl}/api/federation/connect`,
          relay: `${baseUrl}/api/federation/relay`,
        },
        agentApi: `${baseUrl}/api/v2`,
        docs: `${baseUrl}/api/v2/docs`,
      },

      // === DiviDen-Specific Metadata ===
      dividen: {
        protocolVersion: 'DAWP/0.1',
        instanceHealth: {
          users: userCount,
          activeConnections: connectionCount,
        },
        federation: {
          mode: fedConfig?.federationMode || 'closed',
          allowInbound: fedConfig?.allowInbound ?? false,
          allowOutbound: fedConfig?.allowOutbound ?? true,
        },
        relayIntents: [
          'get_info', 'assign_task', 'request_approval',
          'share_update', 'schedule', 'introduce', 'custom',
        ],
        trustLevels: ['full_auto', 'supervised', 'restricted'],
        taskTypes: [
          'research', 'review', 'introductions', 'technical',
          'creative', 'strategy', 'operations', 'mentoring',
          'sales', 'legal', 'finance', 'hr', 'translation', 'custom',
        ],
      },
    };

    return NextResponse.json(agentCard, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 min cache
        'Access-Control-Allow-Origin': '*', // Agent discovery must be CORS-open
      },
    });
  } catch (error: any) {
    console.error('GET /.well-known/agent-card.json error:', error);
    return NextResponse.json(
      { error: 'Failed to generate agent card' },
      { status: 500 }
    );
  }
}
