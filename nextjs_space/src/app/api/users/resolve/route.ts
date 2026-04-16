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

  // Resolve users by username
  const users = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true, name: true, username: true, profilePhotoUrl: true },
  });

  const map: Record<string, { id: string; name: string | null; username: string; avatar: string | null; type?: string }> = {};
  const resolvedUsernames = new Set<string>();
  for (const u of users) {
    if (u.username) {
      map[u.username] = { id: u.id, name: u.name, username: u.username, avatar: u.profilePhotoUrl };
      resolvedUsernames.add(u.username);
    }
  }

  // For any unresolved usernames, check if they match team names (kebab-cased)
  const unresolvedHandles = usernames.filter(u => !resolvedUsernames.has(u));
  if (unresolvedHandles.length > 0) {
    const teams = await prisma.team.findMany({
      where: { isActive: true },
      select: { id: true, name: true, avatar: true },
    });
    for (const team of teams) {
      const kebab = team.name.toLowerCase().replace(/\s+/g, '-');
      if (unresolvedHandles.includes(kebab)) {
        map[kebab] = { id: team.id, name: team.name, username: kebab, avatar: team.avatar, type: 'team' };
      }
    }
  }

  return NextResponse.json({ success: true, data: map });
}
