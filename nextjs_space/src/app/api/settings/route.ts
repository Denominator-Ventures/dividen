import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateModeSchema = z.object({
  mode: z.enum(['cockpit', 'chief_of_staff']),
});

const apiKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic']),
  apiKey: z.string().min(1),
  label: z.string().optional(),
});

// GET: Fetch user settings and API keys
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, mode: true, role: true },
  });

  const apiKeys = await prisma.agentApiKey.findMany({
    select: {
      id: true,
      provider: true,
      label: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: { user, apiKeys },
  });
}

// PUT: Update settings
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const body = await request.json();

  // Update mode
  if (body.mode) {
    const result = updateModeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid mode' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { mode: result.data.mode },
    });
  }

  return NextResponse.json({ success: true });
}

// POST: Add API key
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const result = apiKeySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.errors[0].message },
      { status: 400 }
    );
  }

  const apiKey = await prisma.agentApiKey.create({
    data: {
      provider: result.data.provider,
      apiKey: result.data.apiKey,
      label: result.data.label,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: apiKey.id,
      provider: apiKey.provider,
      label: apiKey.label,
    },
  });
}
