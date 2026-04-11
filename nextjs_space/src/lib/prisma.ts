import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
      : [{ emit: 'event', level: 'query' }, 'error'],
    datasources: {
      db: {
        url: appendConnectionParams(process.env.DATABASE_URL || ''),
      },
    },
  });

  // ── Prisma query event → telemetry_events (sampled) ──
  // We buffer query counts and flush periodically to avoid
  // generating more telemetry than actual queries.
  const queryBuffer: Record<string, { count: number; totalDuration: number }> = {};
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function flushQueryBuffer() {
    const entries = Object.entries(queryBuffer);
    if (entries.length === 0) return;

    // Snapshot and clear
    const snapshot = entries.map(([key, val]) => ({ key, ...val }));
    for (const k of Object.keys(queryBuffer)) delete queryBuffer[k];

    // Batch insert telemetry (fire-and-forget) — single query via createMany
    const data = snapshot.map(({ key, count, totalDuration }) => {
      const [dbAction, dbModel] = key.split(':');
      return {
        type: 'db_query' as const,
        dbAction,
        dbModel: dbModel || null,
        duration: Math.round(totalDuration / count),
        metadata: JSON.stringify({ count, totalDurationMs: Math.round(totalDuration) }),
      };
    });

    client.telemetryEvent.createMany({ data }).catch(() => { /* swallow */ });
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushQueryBuffer();
    }, 30_000); // flush every 30s
  }

  (client.$on as (event: string, handler: (e: { query: string; duration: number }) => void) => void)(
    'query',
    (e: { query: string; duration: number }) => {
      // Skip telemetry table queries to prevent recursion
      if (e.query.includes('telemetry_events')) return;

      // Determine the action type from the raw query
      const q = e.query.trimStart().toUpperCase();
      let action = 'OTHER';
      if (q.startsWith('SELECT')) action = 'SELECT';
      else if (q.startsWith('INSERT')) action = 'INSERT';
      else if (q.startsWith('UPDATE')) action = 'UPDATE';
      else if (q.startsWith('DELETE')) action = 'DELETE';

      // Try to extract the model/table name
      let model = 'unknown';
      const fromMatch = e.query.match(/"public"\."(\w+)"/);
      if (fromMatch) model = fromMatch[1];

      const key = `${action}:${model}`;
      if (!queryBuffer[key]) queryBuffer[key] = { count: 0, totalDuration: 0 };
      queryBuffer[key].count++;
      queryBuffer[key].totalDuration += e.duration;

      scheduleFlush();
    }
  );

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Appends connection pool limits to DATABASE_URL if not already present.
 * Keeps Prisma pool to 10 connections (of 25 max) to leave headroom.
 */
function appendConnectionParams(url: string): string {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  const params: string[] = [];
  if (!url.includes('connection_limit=')) params.push('connection_limit=10');
  if (!url.includes('pool_timeout=')) params.push('pool_timeout=15');
  return params.length > 0 ? `${url}${sep}${params.join('&')}` : url;
}