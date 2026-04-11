export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * POST /api/v2/federation/register — Register a self-hosted instance with the managed platform.
 * This is the "Connect to Network" endpoint.
 *
 * Body:
 *   name       — Display name for the instance
 *   baseUrl    — Public URL of the self-hosted instance
 *   apiKey     — Instance's federation API key (for verification)
 *   version    — Instance version string
 *   userCount  — Number of users on the instance
 *   agentCount — Number of marketplace agents
 *   capabilities — JSON object of what the instance supports
 *
 * Returns:
 *   platformToken — Token for the instance to use when calling managed platform APIs
 *   endpoints     — Map of available managed platform API endpoints
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, baseUrl, apiKey, version, userCount, agentCount, capabilities } = body;

    if (!name || !baseUrl || !apiKey) {
      return NextResponse.json(
        { error: 'name, baseUrl, and apiKey are required' },
        { status: 400 }
      );
    }

    // Normalize URL
    const normalizedUrl = baseUrl.replace(/\/$/, '');

    // Check if instance already exists
    let instance = await prisma.instanceRegistry.findUnique({
      where: { baseUrl: normalizedUrl },
    });

    // Generate a platform token
    const platformToken = `dvd_fed_${crypto.randomBytes(32).toString('hex')}`;

    if (instance) {
      // Re-registration — verify the API key matches
      if (instance.apiKey !== apiKey) {
        return NextResponse.json(
          { error: 'API key mismatch. Use the original instance API key or contact the platform admin.' },
          { status: 403 }
        );
      }

      // Update existing instance
      instance = await prisma.instanceRegistry.update({
        where: { id: instance.id },
        data: {
          name,
          platformLinked: true,
          platformToken,
          isActive: true,
          version: version || null,
          userCount: userCount || null,
          agentCount: agentCount || null,
          metadata: capabilities ? JSON.stringify(capabilities) : instance.metadata,
          lastSeenAt: new Date(),
          lastSyncAt: new Date(),
        },
      });
    } else {
      // New registration
      instance = await prisma.instanceRegistry.create({
        data: {
          name,
          baseUrl: normalizedUrl,
          apiKey,
          platformLinked: true,
          platformToken,
          isActive: true,
          version: version || null,
          userCount: userCount || null,
          agentCount: agentCount || null,
          metadata: capabilities ? JSON.stringify(capabilities) : null,
          lastSeenAt: new Date(),
          lastSyncAt: new Date(),
        },
      });
    }

    // Return platform token and available endpoints
    const baseApiUrl = process.env.NEXTAUTH_URL || 'https://dividen.ai';

    return NextResponse.json({
      success: true,
      instanceId: instance.id,
      platformToken,
      registeredAt: new Date().toISOString(),
      endpoints: {
        discover: `${baseApiUrl}/api/v2/network/discover`,
        updates: `${baseApiUrl}/api/v2/updates`,
        heartbeat: `${baseApiUrl}/api/v2/federation/heartbeat`,
        marketplaceLink: `${baseApiUrl}/api/v2/federation/marketplace-link`,
      },
      features: {
        discovery: true,
        updates: true,
        marketplace: true,
        relay: true,
      },
      message: `Instance "${name}" registered successfully. Use the platformToken for authenticated API calls.`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/v2/federation/register error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
