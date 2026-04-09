import { prisma } from '@/lib/prisma';

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
