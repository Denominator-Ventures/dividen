export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/username/check?username=foo
 *
 * Returns { available: boolean } — real-time uniqueness check for usernames.
 * Works for both signup (no auth required) and settings (optional auth).
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('username') || '';
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');

  if (!clean || clean.length < 2 || clean.length > 30) {
    return NextResponse.json({ available: false, reason: 'Username must be 2–30 characters (letters, numbers, _ . -)' });
  }

  // Reserved usernames
  const reserved = ['admin', 'system', 'divi', 'dividen', 'support', 'help', 'root', 'null', 'undefined', 'api', 'www'];
  if (reserved.includes(clean)) {
    return NextResponse.json({ available: false, reason: 'This username is reserved' });
  }

  const existing = await prisma.user.findFirst({ where: { username: clean } });
  return NextResponse.json({ available: !existing });
}
