import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

/**
 * Fire-and-forget telemetry logger.
 * All calls are non-blocking — errors are silently swallowed
 * to never impact user-facing requests.
 */

export function logRequest(opts: {
  userId?: string | null;
  ip?: string | null;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
}) {
  prisma.telemetryEvent
    .create({
      data: {
        type: 'request',
        userId: opts.userId || null,
        ip: opts.ip || null,
        method: opts.method,
        path: opts.path,
        statusCode: opts.statusCode,
        duration: opts.duration,
      },
    })
    .catch(() => {});
}

export function logError(opts: {
  userId?: string | null;
  ip?: string | null;
  path?: string;
  method?: string;
  errorMessage: string;
  errorStack?: string;
  metadata?: Record<string, unknown>;
}) {
  prisma.telemetryEvent
    .create({
      data: {
        type: 'error',
        userId: opts.userId || null,
        ip: opts.ip || null,
        path: opts.path || null,
        method: opts.method || null,
        errorMessage: opts.errorMessage,
        errorStack: opts.errorStack || null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      },
    })
    .catch(() => {});
}

export function logDbQuery(opts: {
  userId?: string | null;
  dbAction: string; // SELECT, INSERT, UPDATE, DELETE
  dbModel: string;
  duration?: number;
}) {
  prisma.telemetryEvent
    .create({
      data: {
        type: 'db_query',
        userId: opts.userId || null,
        dbAction: opts.dbAction,
        dbModel: opts.dbModel,
        duration: opts.duration || null,
      },
    })
    .catch(() => {});
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(headers: Headers): string | null {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    null
  );
}

// ─── withTelemetry HOF ──────────────────────────────────────────────────────

type RouteHandler = (
  req: NextRequest,
  ctx?: any,
) => Promise<NextResponse | Response>;

/**
 * Wraps a Next.js route handler with automatic telemetry.
 * Logs: method, path, statusCode, duration, userId, ip.
 * On error: logs errorMessage + errorStack, returns 500.
 *
 * Usage:
 *   export const GET = withTelemetry(async (req) => { ... });
 *   export const POST = withTelemetry(async (req) => { ... });
 */
export function withTelemetry(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx?: any) => {
    const start = Date.now();
    const ip = getClientIp(req.headers);
    const method = req.method;
    const path = new URL(req.url).pathname;

    // Try to extract userId from session (non-blocking — don't fail if no session)
    let userId: string | null = null;
    try {
      const session = await getServerSession(authOptions);
      userId = (session?.user as any)?.id || null;
    } catch {
      // session extraction failed — that's fine, log without userId
    }

    try {
      const response = await handler(req, ctx);
      const statusCode = response instanceof NextResponse
        ? response.status
        : (response as any)?.status ?? 200;
      const duration = Date.now() - start;

      logRequest({ userId, ip, method, path, statusCode, duration });
      return response;
    } catch (error: any) {
      const duration = Date.now() - start;
      logError({
        userId,
        ip,
        path,
        method,
        errorMessage: error?.message || 'Unknown error',
        errorStack: error?.stack,
      });
      logRequest({ userId, ip, method, path, statusCode: 500, duration });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  };
}
