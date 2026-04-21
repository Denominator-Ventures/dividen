export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';



export async function GET(req: NextRequest) {
  { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }

  try {
    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '24h'; // 24h, 7d, 30d
    const userId = url.searchParams.get('userId') || undefined;

    const now = new Date();
    let since: Date;
    switch (range) {
      case '7d':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const where = {
      createdAt: { gte: since },
      ...(userId ? { userId } : {}),
    };

    // ── Request stats ──
    const requestEvents = await prisma.telemetryEvent.findMany({
      where: { ...where, type: 'request' },
      select: {
        ip: true,
        method: true,
        path: true,
        statusCode: true,
        duration: true,
        userId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // ── DB query stats ──
    const dbEvents = await prisma.telemetryEvent.findMany({
      where: { ...where, type: 'db_query' },
      select: {
        dbAction: true,
        dbModel: true,
        duration: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // ── Error stats ──
    const errorEvents = await prisma.telemetryEvent.findMany({
      where: { ...where, type: 'error' },
      select: {
        errorMessage: true,
        errorStack: true,
        path: true,
        method: true,
        userId: true,
        ip: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // ── Schema changes (from _prisma_migrations) ──
    let schemaChanges: { id: string; migration_name: string; started_at: Date; finished_at: Date | null; applied_steps_count: number }[] = [];
    try {
      schemaChanges = await prisma.$queryRaw`
        SELECT id, migration_name, started_at, finished_at, applied_steps_count
        FROM "_prisma_migrations"
        ORDER BY started_at DESC
        LIMIT 20
      `;
    } catch { /* table may not exist */ }

    // ── Aggregate summaries ──
    // Unique IPs
    const uniqueIps = [...new Set(requestEvents.map((e: any) => e.ip).filter(Boolean))];

    // Requests by path (top 20)
    const pathCounts: Record<string, number> = {};
    for (const e of requestEvents) {
      if (e.path) pathCounts[e.path] = (pathCounts[e.path] || 0) + 1;
    }
    const topPaths = Object.entries(pathCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([path, count]) => ({ path, count }));

    // DB queries by action
    const dbActionCounts: Record<string, number> = {};
    const dbModelCounts: Record<string, number> = {};
    for (const e of dbEvents) {
      // Parse count from metadata
      let count = 1;
      if (e.metadata) {
        try {
          const meta = JSON.parse(e.metadata);
          count = meta.count || 1;
        } catch { /* ignore */ }
      }
      if (e.dbAction) dbActionCounts[e.dbAction] = (dbActionCounts[e.dbAction] || 0) + count;
      if (e.dbModel) dbModelCounts[e.dbModel] = (dbModelCounts[e.dbModel] || 0) + count;
    }

    // Requests by status code
    const statusCounts: Record<string, number> = {};
    for (const e of requestEvents) {
      const code = String(e.statusCode || 'unknown');
      statusCounts[code] = (statusCounts[code] || 0) + 1;
    }

    // Avg response time
    const durations = requestEvents.filter((e: any) => e.duration).map((e: any) => e.duration!);
    const avgResponseTime = durations.length > 0 ? Math.round(durations.reduce((a: any, b: any) => a + b, 0) / durations.length) : 0;

    // Per-user breakdown
    const userRequestCounts: Record<string, number> = {};
    for (const e of requestEvents) {
      const uid = e.userId || 'anonymous';
      userRequestCounts[uid] = (userRequestCounts[uid] || 0) + 1;
    }

    // Request timeline (hourly buckets)
    const hourBuckets: Record<string, number> = {};
    for (const e of requestEvents) {
      const hour = new Date(e.createdAt).toISOString().slice(0, 13);
      hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
    }
    const requestTimeline = Object.entries(hourBuckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, count]) => ({ hour, count }));

    // Total counts
    const totalRequests = await prisma.telemetryEvent.count({ where: { ...where, type: 'request' } });
    const totalErrors = await prisma.telemetryEvent.count({ where: { ...where, type: 'error' } });
    const totalDbQueries = await prisma.telemetryEvent.count({ where: { ...where, type: 'db_query' } });

    return NextResponse.json({
      range,
      since: since.toISOString(),
      totals: {
        requests: totalRequests,
        errors: totalErrors,
        dbQueryBatches: totalDbQueries,
      },
      uniqueIps,
      avgResponseTime,
      topPaths,
      statusCounts,
      dbActionCounts,
      dbModelCounts,
      userRequestCounts,
      requestTimeline,
      recentErrors: errorEvents.slice(0, 50).map((e: any) => ({
        message: e.errorMessage,
        stack: e.errorStack?.slice(0, 500),
        path: e.path,
        method: e.method,
        userId: e.userId,
        ip: e.ip,
        createdAt: e.createdAt,
      })),
      recentRequests: requestEvents.slice(0, 100).map((e: any) => ({
        ip: e.ip,
        method: e.method,
        path: e.path,
        statusCode: e.statusCode,
        duration: e.duration,
        userId: e.userId,
        createdAt: e.createdAt,
      })),
      schemaChanges: schemaChanges.map((m) => ({
        name: m.migration_name,
        appliedAt: m.started_at,
        finishedAt: m.finished_at,
        steps: m.applied_steps_count,
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[admin/telemetry] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch telemetry', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
