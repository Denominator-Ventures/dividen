export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function parseJsonField(val: string | null, fallback: any = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

// GET: View another user's profile (respecting privacy + connection status)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const currentUserId = (session.user as any).id;
  const { userId: targetUserId } = await params;

  // Can always view own profile via main route, but allow it here too
  if (targetUserId === currentUserId) {
    const profile = await prisma.userProfile.findUnique({ where: { userId: currentUserId } });
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, profile: serializeFull(profile) });
  }

  // Check if there's an active connection
  const connection = await prisma.connection.findFirst({
    where: {
      status: 'active',
      OR: [
        { requesterId: currentUserId, accepterId: targetUserId },
        { requesterId: targetUserId, accepterId: currentUserId },
      ],
    },
  });

  const profile = await prisma.userProfile.findUnique({ where: { userId: targetUserId } });
  if (!profile) {
    return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
  }

  const visibility = profile.visibility || 'connections';
  const sharedSections: string[] = parseJsonField(profile.sharedSections, ['professional', 'lived_experience', 'availability', 'values', 'superpowers']);

  // Private: only owner can see
  if (visibility === 'private') {
    return NextResponse.json({ success: false, error: 'This profile is private' }, { status: 403 });
  }

  // Connections-only: must have active connection
  if (visibility === 'connections' && !connection) {
    return NextResponse.json({ success: false, error: 'You must be connected to view this profile' }, { status: 403 });
  }

  // Return filtered profile based on sharedSections
  const filtered = serializeFiltered(profile, sharedSections);
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true, email: true } });

  return NextResponse.json({
    success: true,
    profile: filtered,
    user: targetUser ? { name: targetUser.name, email: targetUser.email } : null,
    isConnected: !!connection,
  });
}

function serializeFull(p: any) {
  return {
    id: p.id, userId: p.userId,
    headline: p.headline, bio: p.bio,
    skills: parseJsonField(p.skills), experience: parseJsonField(p.experience),
    education: parseJsonField(p.education),
    linkedinUrl: p.linkedinUrl,
    languages: parseJsonField(p.languages), countriesLived: parseJsonField(p.countriesLived),
    lifeMilestones: parseJsonField(p.lifeExperiences), volunteering: parseJsonField(p.volunteering),
    hobbies: parseJsonField(p.hobbies), personalValues: parseJsonField(p.personalValues),
    superpowers: parseJsonField(p.superpowers),
    capacityStatus: p.capacity, capacityNote: p.capacityNote,
    timezone: p.timezone, workingHours: p.workingHours,
    outOfOffice: parseJsonField(p.outOfOffice),
    visibility: p.visibility, sharedSections: parseJsonField(p.sharedSections),
    createdAt: p.createdAt?.toISOString(), updatedAt: p.updatedAt?.toISOString(),
  };
}

function serializeFiltered(p: any, sections: string[]) {
  const result: Record<string, any> = {
    id: p.id, userId: p.userId,
    headline: p.headline, // Always show headline
    capacityStatus: p.capacity, // Always show capacity
  };

  if (sections.includes('professional')) {
    result.bio = p.bio;
    result.skills = parseJsonField(p.skills);
    result.experience = parseJsonField(p.experience);
    result.education = parseJsonField(p.education);
    result.certifications = parseJsonField(p.certifications);
  }
  if (sections.includes('lived_experience')) {
    result.languages = parseJsonField(p.languages);
    result.countriesLived = parseJsonField(p.countriesLived);
    result.lifeMilestones = parseJsonField(p.lifeExperiences);
    result.volunteering = parseJsonField(p.volunteering);
    result.hobbies = parseJsonField(p.hobbies);
  }
  if (sections.includes('availability')) {
    result.capacityNote = p.capacityNote;
    result.timezone = p.timezone;
    result.workingHours = p.workingHours;
    result.outOfOffice = parseJsonField(p.outOfOffice);
  }
  if (sections.includes('values')) {
    result.personalValues = parseJsonField(p.personalValues);
  }
  if (sections.includes('superpowers')) {
    result.superpowers = parseJsonField(p.superpowers);
  }

  return result;
}
