export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/capabilities/[type]
 * Get a specific capability.
 */
export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const capability = await prisma.agentCapability.findUnique({
      where: { userId_type: { userId, type: params.type } },
    });

    if (!capability) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...capability,
        rules: capability.rules ? JSON.parse(capability.rules) : [],
        config: capability.config ? JSON.parse(capability.config) : {},
      },
    });
  } catch (error: any) {
    console.error(`GET /api/capabilities/${params.type} error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/capabilities/[type]
 * Update a specific capability (rules, config, status, identity).
 */
export async function PATCH(req: NextRequest, { params }: { params: { type: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const { rules, config, status, identity, name } = body;

    const updateData: any = {};
    if (rules !== undefined) updateData.rules = JSON.stringify(rules);
    if (config !== undefined) updateData.config = JSON.stringify(config);
    if (status !== undefined) updateData.status = status;
    if (identity !== undefined) updateData.identity = identity;
    if (name !== undefined) updateData.name = name;

    const capability = await prisma.agentCapability.update({
      where: { userId_type: { userId, type: params.type } },
      data: updateData,
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
    console.error(`PATCH /api/capabilities/${params.type} error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/capabilities/[type]
 * Delete a capability.
 */
export async function DELETE(req: NextRequest, { params }: { params: { type: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    await prisma.agentCapability.delete({
      where: { userId_type: { userId, type: params.type } },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`DELETE /api/capabilities/${params.type} error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
