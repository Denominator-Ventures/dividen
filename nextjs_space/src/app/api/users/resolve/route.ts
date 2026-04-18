export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/resolve?usernames=jon,sarah,research-agent,fvp
 *
 * Resolves handles to display info for rendering clickable @mention chips.
 * Returns a map of handle → { id, name, username, avatar, type? }.
 *
 * Resolution order:
 *   1. Local users (by username)
 *   2. Teams (by kebab-cased name)
 *   3. Federated connections (by nickname / peer name / peer email local part) —
 *      only when the request is authenticated. The connection must belong to the
 *      session user.
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

  const map: Record<string, {
    id: string;
    name: string | null;
    username: string;
    avatar: string | null;
    type?: string;
  }> = {};
  const resolvedHandles = new Set<string>();
  for (const u of users) {
    if (u.username) {
      map[u.username] = { id: u.id, name: u.name, username: u.username, avatar: u.profilePhotoUrl };
      resolvedHandles.add(u.username);
    }
  }

  // For any unresolved handles, check if they match team names (kebab-cased)
  const unresolvedHandles = usernames.filter(u => !resolvedHandles.has(u));
  if (unresolvedHandles.length > 0) {
    const teams = await prisma.team.findMany({
      where: { isActive: true },
      select: { id: true, name: true, avatar: true },
    });
    for (const team of teams) {
      const kebab = team.name.toLowerCase().replace(/\s+/g, '-');
      if (unresolvedHandles.includes(kebab)) {
        map[kebab] = { id: team.id, name: team.name, username: kebab, avatar: team.avatar, type: 'team' };
        resolvedHandles.add(kebab);
      }
    }
  }

  // Federated connections — only when authenticated (session-scoped).
  // e.g. user has a federated peer nicknamed "FVP" → `@fvp` resolves to a chip.
  const stillUnresolved = usernames.filter(u => !resolvedHandles.has(u));
  if (stillUnresolved.length > 0) {
    try {
      const session = await getServerSession(authOptions);
      const userId = (session?.user as any)?.id;
      if (userId) {
        const fedConns = await prisma.connection.findMany({
          where: {
            OR: [{ requesterId: userId }, { accepterId: userId }],
            isFederated: true,
            status: 'active',
          },
          select: {
            id: true,
            requesterId: true,
            accepterId: true,
            nickname: true,
            peerNickname: true,
            peerUserName: true,
            peerUserEmail: true,
          },
        });

        for (const c of fedConns) {
          const isRequester = c.requesterId === userId;
          const myNickname = isRequester ? c.nickname : c.peerNickname;
          const displayName = myNickname || c.peerUserName || c.peerUserEmail || 'Peer';

          // Generate possible handles this connection could be referred to as
          const candidates: string[] = [];
          const push = (v?: string | null) => {
            if (!v) return;
            const cleaned = String(v)
              .toLowerCase()
              .split('@')[0]
              .replace(/[^a-z0-9_.-]/g, '-')
              .replace(/^-+|-+$/g, '')
              .slice(0, 30);
            if (cleaned && !candidates.includes(cleaned)) candidates.push(cleaned);
          };
          push(myNickname);
          push(c.peerUserName);
          push(c.peerUserEmail);

          for (const cand of candidates) {
            if (stillUnresolved.includes(cand) && !map[cand]) {
              map[cand] = {
                id: c.id,
                name: displayName,
                username: cand,
                avatar: null,
                type: 'federated',
              };
              resolvedHandles.add(cand);
            }
          }
        }
      }
    } catch {
      // Ignore — federated resolution is best-effort.
    }
  }

  return NextResponse.json({ success: true, data: map });
}
