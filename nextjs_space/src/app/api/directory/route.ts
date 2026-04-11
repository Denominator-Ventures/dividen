export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function parseJsonField(val: string | null, fallback: any = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

// GET /api/directory — browse discoverable users on this instance
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim().toLowerCase() || '';
    const skill = searchParams.get('skill')?.trim().toLowerCase() || '';
    const taskType = searchParams.get('taskType')?.trim() || '';

    // Get all users except the current user, with their profiles
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        profile: true,
      },
    });

    // Get current user's connections to annotate status
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { accepterId: userId },
        ],
      },
      select: {
        requesterId: true,
        accepterId: true,
        status: true,
      },
    });

    const connectionMap = new Map<string, string>();
    for (const c of connections) {
      const peerId = c.requesterId === userId ? c.accepterId : c.requesterId;
      if (peerId) connectionMap.set(peerId, c.status);
    }

    // Filter and transform
    const results = users
      .filter((u: any) => {
        // Only show users with profiles that have public or connections visibility
        // If no profile, they're still discoverable by name/email but with limited info
        const vis = u.profile?.visibility || 'connections';
        if (vis === 'private') return false;
        // "connections" visibility: show in directory but with limited profile details
        // "public" visibility: show full profile
        return true;
      })
      .map((u: any) => {
        const p = u.profile;
        const vis = p?.visibility || 'connections';
        const isPublic = vis === 'public';
        const sharedSections = parseJsonField(p?.sharedSections ?? null, ['professional', 'availability']);

        // Always visible
        const base: any = {
          id: u.id,
          name: u.name,
          email: u.email,
          connectionStatus: connectionMap.get(u.id) || null,
          joinedAt: u.createdAt.toISOString(),
          hasProfile: !!p,
        };

        if (p) {
          // Basic profile info always shared in directory
          base.headline = p.headline;
          base.capacity = p.capacity;
          base.currentTitle = p.currentTitle;
          base.currentCompany = p.currentCompany;

          if (isPublic || sharedSections.includes('professional')) {
            base.skills = parseJsonField(p.skills);
            base.industry = p.industry;
          }
          if (isPublic || sharedSections.includes('availability')) {
            base.timezone = p.timezone;
          }
          if (isPublic || sharedSections.includes('lived_experience')) {
            base.languages = parseJsonField(p.languages);
            base.countriesLived = parseJsonField(p.countriesLived);
            base.superpowers = parseJsonField(p.superpowers);
          }
          base.taskTypes = parseJsonField(p.taskTypes);
          base.bio = isPublic ? p.bio : null;
        }

        return base;
      })
      .filter((u: any) => {
        // Apply search query
        if (q) {
          const haystack = [
            u.name, u.email, u.headline, u.currentTitle,
            u.currentCompany, u.industry, u.bio,
            ...(u.skills || []),
            ...(u.superpowers || []),
          ].filter(Boolean).join(' ').toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        // Skill filter
        if (skill && u.skills) {
          const hasSkill = u.skills.some((s: string) => s.toLowerCase().includes(skill));
          if (!hasSkill) return false;
        }
        // Task type filter
        if (taskType && u.taskTypes) {
          if (!u.taskTypes.includes(taskType)) return false;
        }
        return true;
      });

    return NextResponse.json({
      users: results,
      total: results.length,
    });
  } catch (error: any) {
    console.error('GET /api/directory error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch directory' }, { status: 500 });
  }
}
