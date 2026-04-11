export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// GET /api/federation/instances — list known instances
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instances = await prisma.instanceRegistry.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    // Don't expose full API keys or platform tokens
    return NextResponse.json(
      instances.map((i: any) => ({
        ...i,
        apiKey: i.apiKey ? `${i.apiKey.slice(0, 8)}...` : null,
        platformToken: undefined,
      }))
    );
  } catch (error: any) {
    console.error('GET /api/federation/instances error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/federation/instances — add a known instance
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, baseUrl } = body;

    if (!name || !baseUrl) {
      return NextResponse.json({ error: 'name and baseUrl are required' }, { status: 400 });
    }

    const instance = await prisma.instanceRegistry.create({
      data: {
        name,
        baseUrl: baseUrl.replace(/\/$/, ''), // strip trailing slash
        apiKey: crypto.randomBytes(32).toString('hex'),
        isActive: true,
      },
    });

    return NextResponse.json(instance, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/federation/instances error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
