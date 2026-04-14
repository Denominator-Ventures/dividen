export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

const PRIMARY_HOSTS = ['dividen.ai', 'www.dividen.ai'];

function isPrimaryInstance(): boolean {
  try {
    const host = headers().get('host') || headers().get('x-forwarded-host') || '';
    const cleanHost = host.split(':')[0].toLowerCase();
    if (PRIMARY_HOSTS.includes(cleanHost)) return true;
    // Also check NEXTAUTH_URL for production
    const envUrl = process.env.NEXTAUTH_URL || '';
    if (PRIMARY_HOSTS.some(h => envUrl.includes(h))) return true;
    return false;
  } catch {
    return false;
  }
}

// GET /api/network/status — get network connection status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const isPrimary = isPrimaryInstance();

    // On the primary instance, users are always connected
    if (isPrimary) {
      // Ensure federation config exists and is set to open
      let config = await prisma.federationConfig.findFirst();
      if (!config) {
        const crypto = await import('crypto');
        config = await prisma.federationConfig.create({
          data: {
            instanceName: 'DiviDen',
            instanceUrl: 'https://dividen.ai',
            federationMode: 'open',
            allowInbound: true,
            allowOutbound: true,
            requireApproval: false,
            instanceApiKey: crypto.randomBytes(32).toString('hex'),
          },
        });
      }

      return NextResponse.json({
        connected: true,
        isPrimaryInstance: true,
        networkRole: 'hub',
        instanceName: 'DiviDen',
        instanceUrl: 'https://dividen.ai',
        features: {
          marketplace: true,
          discovery: true,
          relay: true,
          updates: true,
        },
        message: 'You are on the DiviDen primary instance. You are automatically connected to the network.',
      });
    }

    // For self-hosted instances, check if they have an active federation link
    const instances = await prisma.instanceRegistry.findMany({
      where: { isActive: true },
    });

    const connectedToPrimary = instances.some((i: any) =>
      i.baseUrl?.includes('dividen.ai') && i.isActive
    );

    return NextResponse.json({
      connected: connectedToPrimary,
      isPrimaryInstance: false,
      networkRole: connectedToPrimary ? 'node' : 'disconnected',
      connectedInstances: instances.length,
      features: {
        marketplace: connectedToPrimary,
        discovery: connectedToPrimary,
        relay: true,
        updates: connectedToPrimary,
      },
      message: connectedToPrimary
        ? 'Connected to the DiviDen network via the primary instance.'
        : 'Not connected. Use federation settings to connect to the DiviDen network.',
    });
  } catch (error: any) {
    console.error('GET /api/network/status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
