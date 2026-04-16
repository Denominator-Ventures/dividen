export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/resolve?usernames=jon,sarah,research-agent
 *
 * Resolves usernames to user IDs + display info for rendering clickable @mentions.
 * Returns a map of username → { id, name, username, avatar }.
 * No auth required for public profile linking (only returns public-safe fields).
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('usernames') || '';
  const usernames = raw.split(',').map(u => u.trim().toLowerCase()).filter(Boolean).slice(0, 50);

  if (usernames.length === 0) {
    return NextResponse.json({ success: true, data: {} });
  }

  const users = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true, name: true, username: true, profilePhotoUrl: true },
  });

  const map: Record<string, { id: string; name: string | null; username: string; avatar: string | null }> = {};
  for (const u of users) {
    if (u.username) {
      map[u.username] = { id: u.id, name: u.name, username: u.username, avatar: u.profilePhotoUrl };
    }
  }

  return NextResponse.json({ success: true, data: map });
}
