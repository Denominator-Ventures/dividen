export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/capabilities
 * List all agent capabilities for the current user.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const capabilities = await prisma.agentCapability.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    // Parse JSON fields for client
    const parsed = capabilities.map((c: any) => ({
      ...c,
      rules: c.rules ? JSON.parse(c.rules) : [],
      config: c.config ? JSON.parse(c.config) : {},
    }));

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('GET /api/capabilities error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/capabilities
 * Create or update a capability.
 * Body: { type, name?, identity?, rules?, config?, status? }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const { type, name, identity, rules, config, status } = body;

    if (!type) {
      return NextResponse.json({ error: 'Capability type is required' }, { status: 400 });
    }

    const validTypes = ['email', 'meetings', 'custom'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    // Upsert — one capability per type per user
    const capability = await prisma.agentCapability.upsert({
      where: { userId_type: { userId, type } },
      update: {
        ...(name !== undefined && { name }),
        ...(identity !== undefined && { identity }),
        ...(rules !== undefined && { rules: JSON.stringify(rules) }),
        ...(config !== undefined && { config: JSON.stringify(config) }),
        ...(status !== undefined && { status }),
      },
      create: {
        type,
        name: name || (type === 'email' ? 'Outbound Email' : type === 'meetings' ? 'Meeting Scheduling' : 'Custom'),
        identity: identity || 'operator',
        rules: rules ? JSON.stringify(rules) : JSON.stringify([]),
        config: config ? JSON.stringify(config) : JSON.stringify({}),
        status: status || 'setup',
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...capability,
        rules: capability.rules ? JSON.parse(capability.rules) : [],
        config: capability.config ? JSON.parse(capability.config) : {},
      },
    });
  } catch (error: any) {
    console.error('POST /api/capabilities error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
