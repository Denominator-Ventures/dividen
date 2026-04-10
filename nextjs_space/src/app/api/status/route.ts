export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  let dbConnected = false;
  let userCount = 0;

  try {
    userCount = await prisma.user.count();
    dbConnected = true;
  } catch {
    // DB not connected
  }

  return NextResponse.json({
    success: true,
    data: {
      version: '0.1.0',
      database: dbConnected ? 'connected' : 'disconnected',
      users: userCount,
      needsSetup: userCount === 0,
      timestamp: new Date().toISOString(),
    },
  });
}
