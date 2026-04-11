export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const checks: Record<string, unknown> = {};
  let healthy = true;

  // 1. Database connection
  try {
    const userCount = await prisma.user.count();
    checks.database = { status: 'connected', users: userCount };
    checks.needsSetup = userCount === 0;
  } catch (e: unknown) {
    checks.database = { status: 'disconnected', error: e instanceof Error ? e.message : 'Unknown error' };
    checks.needsSetup = true;
    healthy = false;
  }

  // 2. Core tables exist
  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    const tableNames = tables.map((t: any) => t.tablename);
    const requiredTables = ['User', 'Card', 'QueueItem', 'Contact', 'ChatMessage', 'Connection'];
    const missing = requiredTables.filter(
      (t) => !tableNames.some((tn: any) => tn.toLowerCase() === t.toLowerCase())
    );
    checks.migrations = {
      status: missing.length === 0 ? 'complete' : 'incomplete',
      tables: tableNames.length,
      ...(missing.length > 0 ? { missingTables: missing } : {}),
    };
    if (missing.length > 0) healthy = false;
  } catch {
    checks.migrations = { status: 'unknown', note: 'Could not query tables' };
  }

  // 3. Environment
  checks.environment = {
    nextauthSecret: !!process.env.NEXTAUTH_SECRET,
    adminPassword: !!process.env.ADMIN_PASSWORD,
    llmConfigured: !!process.env.ABACUSAI_API_KEY,
  };

  if (!process.env.NEXTAUTH_SECRET) healthy = false;

  // 4. Version
  checks.version = '2.1.0';
  checks.timestamp = new Date().toISOString();

  return NextResponse.json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
  }, { status: healthy ? 200 : 503 });
}
