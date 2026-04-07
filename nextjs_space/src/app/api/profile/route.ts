export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper to safely parse JSON string fields
function parseJsonField(val: string | null, fallback: any = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

// Transform DB record to API response
function serializeProfile(p: any) {
  return {
    id: p.id,
    userId: p.userId,
    headline: p.headline,
    bio: p.bio,
    skills: parseJsonField(p.skills),
    experience: parseJsonField(p.experience),
    education: parseJsonField(p.education),
    certifications: [],
    linkedinUrl: p.linkedinUrl,
    currentTitle: p.currentTitle,
    currentCompany: p.currentCompany,
    industry: p.industry,
    languages: parseJsonField(p.languages),
    countriesLived: parseJsonField(p.countriesLived),
    lifeMilestones: parseJsonField(p.lifeExperiences),
    volunteering: parseJsonField(p.volunteering),
    hobbies: parseJsonField(p.hobbies),
    personalValues: parseJsonField(p.personalValues),
    superpowers: parseJsonField(p.superpowers),
    taskTypes: parseJsonField(p.taskTypes),
    capacityStatus: p.capacity,
    capacityNote: p.capacityNote,
    timezone: p.timezone,
    workingHours: p.workingHours,
    outOfOffice: parseJsonField(p.outOfOffice),
    visibility: p.visibility,
    sharedSections: parseJsonField(p.sharedSections, ['professional', 'lived_experience', 'availability', 'values', 'superpowers']),
    linkedinData: parseJsonField(p.linkedinData, null),
    createdAt: p.createdAt?.toISOString(),
    updatedAt: p.updatedAt?.toISOString(),
  };
}

// GET: Fetch current user's profile (create if missing)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  let profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) {
    // Auto-create empty profile
    profile = await prisma.userProfile.create({
      data: {
        user: { connect: { id: userId } },
        capacity: 'available',
        visibility: 'connections',
        sharedSections: JSON.stringify(['professional', 'lived_experience', 'availability', 'values', 'superpowers']),
      },
    });
  }

  return NextResponse.json({ success: true, profile: serializeProfile(profile) });
}

// PUT: Update current user's profile
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const body = await request.json();

  // Fields that are JSON arrays stored as strings
  const jsonFields = [
    'skills', 'experience', 'education',
    'languages', 'countriesLived', 'volunteering',
    'hobbies', 'personalValues', 'superpowers', 'taskTypes', 'outOfOffice', 'sharedSections',
  ];
  // Client sends lifeMilestones, DB stores as lifeExperiences
  const fieldMap: Record<string, string> = {
    capacityStatus: 'capacity',
    lifeMilestones: 'lifeExperiences',
  };
  // Plain string/enum fields (client name → DB name)
  const plainFields = [
    'headline', 'bio', 'linkedinUrl', 'capacityStatus', 'capacityNote',
    'timezone', 'workingHours', 'visibility', 'currentTitle', 'currentCompany', 'industry',
  ];

  const data: Record<string, any> = {};
  for (const f of plainFields) {
    if (body[f] !== undefined) {
      const dbField = fieldMap[f] || f;
      data[dbField] = body[f];
    }
  }
  for (const f of jsonFields) {
    if (body[f] !== undefined) data[f] = JSON.stringify(body[f]);
  }
  // lifeMilestones → lifeExperiences
  if (body.lifeMilestones !== undefined) {
    data.lifeExperiences = JSON.stringify(body.lifeMilestones);
  }
  // linkedinData is a special JSON blob
  if (body.linkedinData !== undefined) {
    data.linkedinData = JSON.stringify(body.linkedinData);
  }

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    update: data,
    create: {
      user: { connect: { id: userId } },
      capacity: 'available',
      visibility: 'connections',
      sharedSections: JSON.stringify(['professional', 'lived_experience', 'availability', 'values', 'superpowers']),
      ...data,
    },
  });

  return NextResponse.json({ success: true, profile: serializeProfile(profile) });
}
