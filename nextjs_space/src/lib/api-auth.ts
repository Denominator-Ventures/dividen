import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentContext {
  keyId: string;
  keyName: string;
  userId: string;
  permissions: string[];
}

export interface AuthenticatedRequest {
  agent: AgentContext;
}

// ─── Rate Limiting (in-memory, per-key) ──────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 120; // 120 requests per minute per key

function checkRateLimit(keyId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = rateLimitMap.get(keyId);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(keyId, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - entry.count),
    resetAt: entry.resetAt,
  };
}

// Periodic cleanup of stale entries
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 300_000); // every 5 minutes

// ─── JSON Response Helpers ───────────────────────────────────────────────────

export function jsonError(message: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers }
  );
}

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

// ─── Auth Middleware ─────────────────────────────────────────────────────────

/**
 * Validates Bearer token from Authorization header against ExternalApiKey table.
 * Returns the agent context or an error response.
 */
export async function authenticateAgent(
  request: NextRequest,
  requiredPermission?: string
): Promise<AgentContext | NextResponse> {
  // Extract Bearer token
  // Derive base URL for RFC 9728 resource_metadata pointer
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'dividen.ai';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const resourceMetadataUrl = `${proto}://${host}/.well-known/oauth-protected-resource`;
  const wwwAuthHeader = `Bearer resource_metadata="${resourceMetadataUrl}"`;

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonError('Missing or invalid Authorization header. Expected: Bearer <api_key>', 401, {
      'WWW-Authenticate': wwwAuthHeader,
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return jsonError('Empty API key', 401, {
      'WWW-Authenticate': wwwAuthHeader,
    });
  }

  // Look up the key
  const apiKey = await prisma.externalApiKey.findUnique({
    where: { key: token },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!apiKey) {
    return jsonError('Invalid API key', 401, {
      'WWW-Authenticate': wwwAuthHeader,
    });
  }

  if (!apiKey.isActive) {
    return jsonError('API key is deactivated', 403);
  }

  // Check expiration
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return jsonError('API key has expired', 403);
  }

  // Rate limiting
  const rateLimit = checkRateLimit(apiKey.id);
  if (!rateLimit.allowed) {
    return jsonError('Rate limit exceeded. Try again later.', 429, {
      'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
      'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
    });
  }

  // Parse permissions
  let permissions: string[] = ['all'];
  try {
    if (apiKey.permissions !== 'all') {
      permissions = JSON.parse(apiKey.permissions);
    }
  } catch {
    permissions = ['all'];
  }

  // Check required permission
  if (requiredPermission && !permissions.includes('all') && !permissions.includes(requiredPermission)) {
    return jsonError(`Insufficient permissions. Required: ${requiredPermission}`, 403);
  }

  // Update last used (non-blocking)
  prisma.externalApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
  }).catch(() => {});

  return {
    keyId: apiKey.id,
    keyName: apiKey.name,
    userId: apiKey.userId,
    permissions,
  };
}

/**
 * Helper: check if authenticateAgent returned an error response.
 */
export function isAuthError(result: AgentContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
