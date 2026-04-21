import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

// GET - List service API keys
async function _GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const keys = await prisma.serviceApiKey.findMany({
    where: { userId: userId },
    orderBy: { createdAt: 'desc' },
  });

  // Mask key values - only show last 4 characters
  const masked = keys.map((k: any) => ({
    id: k.id,
    service: k.service,
    keyName: k.keyName,
    keyHint: '••••' + k.keyValue.slice(-4),
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
  }));

  return NextResponse.json({ success: true, data: masked });
}

// POST - Add a service API key
async function _POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { service, keyName, keyValue } = body;

  if (!service || !keyName || !keyValue) {
    return NextResponse.json(
      { error: 'service, keyName, and keyValue are required' },
      { status: 400 }
    );
  }

  const key = await prisma.serviceApiKey.create({
    data: {
      service,
      keyName,
      keyValue, // In production, encrypt this
      userId: userId,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: key.id,
      service: key.service,
      keyName: key.keyName,
      keyHint: '••••' + key.keyValue.slice(-4),
      createdAt: key.createdAt,
    },
  });
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
