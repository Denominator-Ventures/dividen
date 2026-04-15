export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCapabilityModuleSpec } from '@/lib/capability-module';

/**
 * GET /api/v2/prompt-groups — Public API for the relevance engine.
 *
 * Returns the complete prompt group registry, signal patterns, scoring parameters,
 * and the CapabilityModule spec. Designed for federation alignment — other DiviDen
 * instances can sync their signal patterns with this endpoint.
 *
 * Auth: Bearer token (platform token or API key from registered instance)
 *       Falls back to FEDERATION_API_KEY env var.
 *
 * Response:
 *   {
 *     version: "1.0",
 *     groups: [...],
 *     scoring: {...},
 *     capabilityModuleSpec: {...}
 *   }
 */
export async function GET(req: NextRequest) {
  // ── Auth ──
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Bearer token required' }, { status: 401 });
  }

  // Check against registered instances
  const instance = await prisma.instanceRegistry.findFirst({
    where: {
      OR: [
        { platformToken: token, platformLinked: true, isActive: true },
        { apiKey: token, isActive: true },
      ],
    },
    select: { id: true, name: true },
  });

  const localKey = process.env.FEDERATION_API_KEY;
  const adminPw = process.env.ADMIN_PASSWORD;
  const isLocalAuth = !instance && ((localKey && token === localKey) || (adminPw && token === adminPw));

  if (!instance && !isLocalAuth) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // ── Build response ──
  const groups = [
    {
      index: 1,
      name: 'identity',
      alwaysLoaded: true,
      signalPatterns: [],
      description: 'Agent identity, operating rules, and current timestamp.',
    },
    {
      index: 2,
      name: 'state',
      alwaysLoaded: true,
      signalPatterns: [],
      description: 'Active state: NOW priorities, board digest, queue snapshot.',
    },
    {
      index: 3,
      name: 'conversation',
      alwaysLoaded: true,
      signalPatterns: [],
      description: 'Conversation history and threading context.',
    },
    {
      index: 4,
      name: 'people',
      alwaysLoaded: false,
      signalPatterns: ['contact|crm|person|people|who|team|profile|relationship|connection|colleague|client|partner'],
      description: 'CRM contacts, user profiles, and relationship data.',
    },
    {
      index: 5,
      name: 'memory',
      alwaysLoaded: false,
      signalPatterns: ['remember|learned|pattern|preference|always|usually|last time|before'],
      description: 'User learning, behavioral patterns, and preferences.',
    },
    {
      index: 6,
      name: 'schedule',
      alwaysLoaded: false,
      signalPatterns: ['calendar|event|meeting|schedule|appointment|today|tomorrow|this week|upcoming|deadline|due'],
      description: 'Calendar events, appointments, and scheduling context.',
    },
    {
      index: 7,
      name: 'capabilities_core',
      alwaysLoaded: true,
      signalPatterns: [],
      description: 'Core action tags: Card CRUD, checklists, queue, goals, widgets, linked kards, continuous task awareness.',
    },
    {
      index: 8,
      name: 'capabilities_triage',
      alwaysLoaded: false,
      signalPatterns: ['triage|catch[- ]?up|signal|inbox.*analy|review.*email|morning.*brief|process.*inbox|what.*new|unread'],
      description: 'Full 8-step triage protocol, outbound capabilities, signal processing.',
    },
    {
      index: 9,
      name: 'capabilities_routing',
      alwaysLoaded: false,
      signalPatterns: ['route|delegate|assign|outsource|find.*someone|post.*task|task.*board|find.*work|hire|job|decompose|propose.*task'],
      description: 'Task detection, routing waterfall, task board, orchestration, invite intake.',
    },
    {
      index: 10,
      name: 'capabilities_federation',
      alwaysLoaded: false,
      signalPatterns: ['federation|entity.*resolve|serendipity|network.*brief|FVP|cross.*instance|who.*should.*meet'],
      description: 'Cross-instance entity resolution, serendipity, network briefing.',
    },
    {
      index: 11,
      name: 'capabilities_marketplace',
      alwaysLoaded: false,
      signalPatterns: ['marketplace|browse.*agent|install.*agent|execute.*agent|subscribe.*agent|uninstall'],
      description: 'Agent marketplace: list, execute, subscribe, install, uninstall.',
    },
    {
      index: 12,
      name: 'relay',
      alwaysLoaded: false,
      signalPatterns: ['relay|ambient|broadcast|connection|send to|ask\\s\\w+|tell\\s\\w+|coordinate|delegate|route|federation'],
      description: 'Connection management, relay protocol, ambient broadcasting.',
    },
    {
      index: 13,
      name: 'extensions',
      alwaysLoaded: false,
      signalPatterns: ['extension|skill|persona|plugin|custom'],
      description: 'Agent skills, personas, plugins, and custom extensions.',
    },
    {
      index: 14,
      name: 'setup',
      alwaysLoaded: false,
      signalPatterns: ['setup|configure|settings|api key|webhook|integration|connect|onboard'],
      description: 'Platform configuration, API keys, webhooks, integrations.',
    },
    {
      index: 15,
      name: 'business',
      alwaysLoaded: false,
      signalPatterns: ['earning|payment|agreement|contract|job|recording|stripe|reputation|invoice'],
      description: 'Business operations: earnings, agreements, marketplace agents, reputation, recordings.',
    },
    {
      index: 16,
      name: 'team',
      alwaysLoaded: false,
      signalPatterns: ['team|project\\smember|collaborate|cross-member|team agent'],
      description: 'Team agent context, cross-member collaboration.',
    },
    {
      index: 17,
      name: 'active_caps',
      alwaysLoaded: false,
      signalPatterns: ['capability|email.*draft|meeting.*schedule|outbound|send.*email'],
      description: 'User\'s active outbound capabilities (email, calendar, etc.).',
    },
  ];

  const scoring = {
    messageMatchWeight: 0.6,
    contextMatchWeight: 0.3,
    baseline: 0.05,
    threshold: 0.3,
    alwaysLoadedScore: 1.0,
    contextWindow: 'Last 3 messages concatenated',
    shortMessageBehavior: 'Messages < 15 chars or greetings load all groups',
  };

  const capabilityModuleSpec = getCapabilityModuleSpec();

  return NextResponse.json({
    version: '1.0',
    totalGroups: groups.length,
    groups,
    scoring,
    capabilityModuleSpec,
    dynamicModules: {
      description: 'In addition to the 17 static groups, installed CapabilityModules are scored independently using their own signalPatterns. They load alongside static groups when relevant.',
      maxModulesPerUser: 30,
      maxTokenBudget: 4000,
      scoringAlgorithm: 'Same as static groups — message match (+0.6), context match (+0.3), baseline (+0.05). Modules with alwaysLoad=true always score 1.0.',
    },
    _links: {
      self: '/api/v2/prompt-groups',
      capabilityModuleSpec: '/api/v2/prompt-groups/module-spec',
      federation: '/api/v2/federation/register',
      marketplace: '/api/v2/federation/marketplace-link',
    },
  });
}
