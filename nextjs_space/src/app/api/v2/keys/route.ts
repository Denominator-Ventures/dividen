import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.union([
    z.literal('all'),
    z.array(z.enum(['queue', 'chat', 'kanban', 'contacts'])).min(1),
  ]).default('all'),
  expiresInDays: z.number().positive().optional(),
});

function generateApiKey(): string {
  const bytes = randomBytes(32);
  return `dvd_${bytes.toString('base64url')}`;
}

// GET: List external API keys
async function _GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const keys = await prisma.externalApiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      usageCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: keys });
}

// POST: Create a new external API key
async function _POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();
  const result = createKeySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const rawKey = generateApiKey();
  const keyPrefix = rawKey.slice(0, 12) + '...';
  const permissions = Array.isArray(result.data.permissions)
    ? JSON.stringify(result.data.permissions)
    : 'all';

  let expiresAt: Date | null = null;
  if (result.data.expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + result.data.expiresInDays);
  }

  const apiKey = await prisma.externalApiKey.create({
    data: {
      name: result.data.name,
      key: rawKey,
      keyPrefix,
      permissions,
      expiresAt,
      userId,
    },
  });

  // Return the full key ONLY on creation (won't be shown again)
  return NextResponse.json({
    success: true,
    data: {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey, // Full key - only shown once
      keyPrefix,
      permissions: result.data.permissions,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    },
  }, { status: 201 });
}

// DELETE: Revoke/delete an API key
async function _DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get('id');

  if (!keyId) {
    return NextResponse.json({ success: false, error: 'Missing key id' }, { status: 400 });
  }

  // Verify ownership
  const key = await prisma.externalApiKey.findFirst({
    where: { id: keyId, userId },
  });

  if (!key) {
    return NextResponse.json({ success: false, error: 'Key not found' }, { status: 404 });
  }

  await prisma.externalApiKey.delete({ where: { id: keyId } });

  return NextResponse.json({ success: true });
}

// PATCH: Toggle active status
async function _PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();
  const { id, isActive } = body;

  if (!id || typeof isActive !== 'boolean') {
    return NextResponse.json({ success: false, error: 'Missing id or isActive' }, { status: 400 });
  }

  const key = await prisma.externalApiKey.findFirst({
    where: { id, userId },
  });

  if (!key) {
    return NextResponse.json({ success: false, error: 'Key not found' }, { status: 404 });
  }

  const updated = await prisma.externalApiKey.update({
    where: { id },
    data: { isActive },
  });

  return NextResponse.json({ success: true, data: { id: updated.id, isActive: updated.isActive } });
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
export const PATCH = withTelemetry(_PATCH);
export const DELETE = withTelemetry(_DELETE);
