export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { withTelemetry } from '@/lib/telemetry';


/**
 * POST /api/admin/federation-check
 * 
 * Admin-only endpoint to probe an instance's agent card and validate
 * DAWP compliance, federation readiness, and relay capability.
 * 
 * Body: { url: string } — the base URL of the instance to probe
 * If url is omitted, probes self.
 */

interface CheckResult {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  detail: string;
}


async function _POST(req: NextRequest) {
  { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }

  const body = await req.json().catch(() => ({}));
  let targetUrl: string = body.url || '';

  // Self-probe: derive from request headers
  const isSelfCheck = !targetUrl;
  if (isSelfCheck) {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    targetUrl = `${proto}://${host}`;
  }

  // Clean URL
  targetUrl = targetUrl.replace(/\/$/, '');
  const agentCardUrl = `${targetUrl}/.well-known/agent-card.json`;

  const checks: CheckResult[] = [];
  let agentCard: any = null;
  let fetchError: string | null = null;
  let httpStatus: number | null = null;
  let responseTime: number | null = null;

  // ── 1. Fetch agent card ────────────────────────────────────────────────
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(agentCardUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    responseTime = Date.now() - start;
    httpStatus = res.status;

    if (res.ok) {
      const text = await res.text();
      try {
        agentCard = JSON.parse(text);
        checks.push({ id: 'fetch', label: 'Agent Card Reachable', status: 'pass', detail: `${agentCardUrl} responded in ${responseTime}ms` });
      } catch {
        checks.push({ id: 'fetch', label: 'Agent Card Reachable', status: 'fail', detail: `Response is not valid JSON` });
      }
    } else {
      checks.push({ id: 'fetch', label: 'Agent Card Reachable', status: 'fail', detail: `HTTP ${httpStatus} — ${res.statusText}` });
    }

    // Check CORS header
    const cors = res.headers.get('access-control-allow-origin');
    if (cors === '*') {
      checks.push({ id: 'cors', label: 'CORS Open (required for discovery)', status: 'pass', detail: 'Access-Control-Allow-Origin: *' });
    } else if (cors) {
      checks.push({ id: 'cors', label: 'CORS Open (required for discovery)', status: 'warn', detail: `CORS restricted to: ${cors}` });
    } else {
      checks.push({ id: 'cors', label: 'CORS Open (required for discovery)', status: 'warn', detail: 'No CORS header — browser-based discovery may fail' });
    }
  } catch (err: any) {
    fetchError = err.name === 'AbortError' ? 'Timeout (10s)' : err.message;
    checks.push({ id: 'fetch', label: 'Agent Card Reachable', status: 'fail', detail: `Failed to reach ${agentCardUrl}: ${fetchError}` });
    checks.push({ id: 'cors', label: 'CORS Open', status: 'skip', detail: 'Cannot check — agent card unreachable' });
  }

  // If we couldn't get the card, return early
  if (!agentCard) {
    return NextResponse.json({
      url: targetUrl,
      agentCardUrl,
      isSelfCheck,
      httpStatus,
      responseTime,
      checks,
      agentCard: null,
      score: { passed: checks.filter(c => c.status === 'pass').length, total: checks.length },
    });
  }

  // ── 2. Validate A2A standard fields ────────────────────────────────────
  const requiredFields = ['name', 'url', 'version', 'protocol'];
  for (const field of requiredFields) {
    if (agentCard[field]) {
      checks.push({ id: `a2a-${field}`, label: `A2A Field: ${field}`, status: 'pass', detail: String(agentCard[field]) });
    } else {
      checks.push({ id: `a2a-${field}`, label: `A2A Field: ${field}`, status: 'fail', detail: `Missing required A2A field` });
    }
  }

  // ── 3. Validate DAWP metadata ──────────────────────────────────────────
  const dividen = agentCard.dividen;
  if (dividen) {
    checks.push({ id: 'dawp', label: 'DAWP Metadata Present', status: 'pass', detail: `Protocol: ${dividen.protocolVersion || 'unknown'}` });

    // Protocol version
    if (dividen.protocolVersion === 'DAWP/0.1') {
      checks.push({ id: 'dawp-version', label: 'DAWP Version', status: 'pass', detail: 'DAWP/0.1' });
    } else if (dividen.protocolVersion) {
      checks.push({ id: 'dawp-version', label: 'DAWP Version', status: 'warn', detail: `${dividen.protocolVersion} (expected DAWP/0.1)` });
    } else {
      checks.push({ id: 'dawp-version', label: 'DAWP Version', status: 'fail', detail: 'Missing protocolVersion' });
    }

    // Relay intents
    if (Array.isArray(dividen.relayIntents) && dividen.relayIntents.length > 0) {
      checks.push({ id: 'relay-intents', label: 'Relay Intents Declared', status: 'pass', detail: `${dividen.relayIntents.length} intents: ${dividen.relayIntents.join(', ')}` });
    } else {
      checks.push({ id: 'relay-intents', label: 'Relay Intents Declared', status: 'fail', detail: 'No relay intents in agent card' });
    }

    // Trust levels
    if (Array.isArray(dividen.trustLevels) && dividen.trustLevels.length > 0) {
      checks.push({ id: 'trust-levels', label: 'Trust Levels Declared', status: 'pass', detail: dividen.trustLevels.join(', ') });
    } else {
      checks.push({ id: 'trust-levels', label: 'Trust Levels Declared', status: 'warn', detail: 'No trust levels declared' });
    }

    // Task types
    if (Array.isArray(dividen.taskTypes) && dividen.taskTypes.length > 0) {
      checks.push({ id: 'task-types', label: 'Task Types Declared', status: 'pass', detail: `${dividen.taskTypes.length} types` });
    } else {
      checks.push({ id: 'task-types', label: 'Task Types Declared', status: 'warn', detail: 'No task types — routing will be limited' });
    }

    // Federation config
    const fed = dividen.federation;
    if (fed) {
      checks.push({ id: 'fed-mode', label: 'Federation Mode', status: 'pass', detail: `Mode: ${fed.mode}, Inbound: ${fed.allowInbound}, Outbound: ${fed.allowOutbound}` });

      if (!fed.allowInbound) {
        checks.push({ id: 'fed-inbound', label: 'Inbound Federation', status: 'warn', detail: 'Inbound disabled — other instances cannot send relays here' });
      } else {
        checks.push({ id: 'fed-inbound', label: 'Inbound Federation', status: 'pass', detail: 'Accepting inbound relays' });
      }
    } else {
      checks.push({ id: 'fed-mode', label: 'Federation Config', status: 'fail', detail: 'No federation configuration in agent card' });
    }

    // Instance health
    const health = dividen.instanceHealth;
    if (health) {
      checks.push({ id: 'health', label: 'Instance Health', status: 'pass', detail: `${health.users} user(s), ${health.activeConnections} active connection(s)` });
    }
  } else {
    checks.push({ id: 'dawp', label: 'DAWP Metadata Present', status: 'fail', detail: 'No dividen.* metadata block — this is not a DAWP-compliant instance' });
  }

  // ── 4. Validate skills ─────────────────────────────────────────────────
  if (Array.isArray(agentCard.skills) && agentCard.skills.length > 0) {
    const skillIds = agentCard.skills.map((s: any) => s.id);
    checks.push({ id: 'skills', label: 'Skills Declared', status: 'pass', detail: `${agentCard.skills.length} skills: ${skillIds.join(', ')}` });

    // Check for relay skill specifically
    if (skillIds.includes('relay')) {
      checks.push({ id: 'skill-relay', label: 'Relay Skill', status: 'pass', detail: 'Instance supports agent relays' });
    } else {
      checks.push({ id: 'skill-relay', label: 'Relay Skill', status: 'warn', detail: 'No relay skill — federation relays may not work' });
    }
  } else {
    checks.push({ id: 'skills', label: 'Skills Declared', status: 'fail', detail: 'No skills in agent card' });
  }

  // ── 5. Validate authentication ─────────────────────────────────────────
  if (agentCard.authentication?.schemes?.length > 0) {
    checks.push({ id: 'auth', label: 'Authentication Configured', status: 'pass', detail: `Schemes: ${agentCard.authentication.schemes.join(', ')}` });
  } else {
    checks.push({ id: 'auth', label: 'Authentication Configured', status: 'warn', detail: 'No authentication scheme — API access unprotected' });
  }

  // ── 6. Validate endpoints ──────────────────────────────────────────────
  const endpoints = agentCard.endpoints;
  if (endpoints) {
    const endpointChecks = [
      ['a2a', endpoints.a2a],
      ['federation.connect', endpoints.federation?.connect],
      ['federation.relay', endpoints.federation?.relay],
      ['agentApi', endpoints.agentApi],
    ];
    for (const [name, url] of endpointChecks) {
      if (url) {
        checks.push({ id: `endpoint-${name}`, label: `Endpoint: ${name}`, status: 'pass', detail: url as string });
      } else {
        checks.push({ id: `endpoint-${name}`, label: `Endpoint: ${name}`, status: 'fail', detail: 'Not declared' });
      }
    }
  } else {
    checks.push({ id: 'endpoints', label: 'Endpoints Declared', status: 'fail', detail: 'No endpoints block in agent card' });
  }

  // ── 7. Connectivity test (federation/connect) ──────────────────────────
  if (endpoints?.federation?.connect) {
    try {
      const connectRes = await fetch(endpoints.federation.connect, {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      if (connectRes) {
        checks.push({ id: 'connect-probe', label: 'Federation Connect Endpoint Reachable', status: 'pass', detail: `HTTP ${connectRes.status}` });
      } else {
        checks.push({ id: 'connect-probe', label: 'Federation Connect Endpoint Reachable', status: 'warn', detail: 'Could not reach federation connect endpoint' });
      }
    } catch {
      checks.push({ id: 'connect-probe', label: 'Federation Connect Endpoint Reachable', status: 'warn', detail: 'Probe failed' });
    }
  }

  // ── Score ───────────────────────────────────────────────────────────────
  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const warned = checks.filter(c => c.status === 'warn').length;

  return NextResponse.json({
    url: targetUrl,
    agentCardUrl,
    isSelfCheck,
    httpStatus,
    responseTime,
    checks,
    agentCard,
    score: { passed, failed, warned, total: checks.length },
  });
}

export const POST = withTelemetry(_POST);
