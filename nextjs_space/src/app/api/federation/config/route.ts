export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// GET /api/federation/config — get federation settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let config = await prisma.federationConfig.findFirst();
    if (!config) {
      // Create default config
      config = await prisma.federationConfig.create({
        data: {
          instanceName: 'DiviDen',
          federationMode: 'closed',
          allowInbound: false,
          allowOutbound: true,
          requireApproval: true,
          instanceApiKey: crypto.randomBytes(32).toString('hex'),
        },
      });
    }

    // Don't expose the API key in full
    return NextResponse.json({
      id: config.id,
      instanceName: config.instanceName,
      instanceUrl: config.instanceUrl,
      federationMode: config.federationMode,
      allowInbound: config.allowInbound,
      allowOutbound: config.allowOutbound,
      requireApproval: config.requireApproval,
      hasApiKey: !!config.instanceApiKey,
    });
  } catch (error: any) {
    console.error('GET /api/federation/config error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/federation/config — update federation settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can change federation settings
    const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    let config = await prisma.federationConfig.findFirst();

    const data: any = {};
    if (body.instanceName !== undefined) data.instanceName = body.instanceName;
    if (body.instanceUrl !== undefined) data.instanceUrl = body.instanceUrl;
    if (body.federationMode !== undefined) data.federationMode = body.federationMode;
    if (body.allowInbound !== undefined) data.allowInbound = body.allowInbound;
    if (body.allowOutbound !== undefined) data.allowOutbound = body.allowOutbound;
    if (body.requireApproval !== undefined) data.requireApproval = body.requireApproval;
    if (body.regenerateApiKey) {
      data.instanceApiKey = crypto.randomBytes(32).toString('hex');
    }

    if (config) {
      config = await prisma.federationConfig.update({
        where: { id: config.id },
        data,
      });
    } else {
      config = await prisma.federationConfig.create({
        data: {
          ...data,
          instanceApiKey: data.instanceApiKey || crypto.randomBytes(32).toString('hex'),
        },
      });
    }

    return NextResponse.json({
      id: config.id,
      instanceName: config.instanceName,
      instanceUrl: config.instanceUrl,
      federationMode: config.federationMode,
      allowInbound: config.allowInbound,
      allowOutbound: config.allowOutbound,
      requireApproval: config.requireApproval,
      hasApiKey: !!config.instanceApiKey,
    });
  } catch (error: any) {
    console.error('PUT /api/federation/config error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
