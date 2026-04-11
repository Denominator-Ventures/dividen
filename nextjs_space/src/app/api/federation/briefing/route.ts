/**
 * Federation Briefing API
 * FVP Proposal #13
 *
 * POST — receive a briefing request from a connected instance
 * GET  — generate a local network briefing for the authenticated user
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  generateLocalBriefingContribution,
  compileNetworkBriefing,
} from '@/lib/federation/composite-prompts';

// GET — authenticated user requests their full network briefing
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const briefing = await compileNetworkBriefing(userId);

  return NextResponse.json(briefing);
}

// POST — federation peer requests this instance's briefing contribution
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  // Accept either Bearer token or connection-based auth
  let authenticated = false;

  if (authHeader?.startsWith('Bearer ')) {
    const key = authHeader.slice(7);
    const apiKey = await prisma.agentApiKey.findFirst({
      where: { apiKey: key, isActive: true },
    });
    if (apiKey) authenticated = true;
  }

  if (!authenticated) {
    // Try connection-based auth from body
    try {
      const body = await req.json();
      const { connectionId } = body;
      if (connectionId) {
        const conn = await prisma.connection.findUnique({ where: { id: connectionId } });
        if (conn && conn.status === 'active') {
          authenticated = true;

          // Return contribution for the connection's user
          const userId = conn.requesterId || conn.accepterId;
          if (userId) {
            const contribution = await generateLocalBriefingContribution(userId);
            return NextResponse.json({ contribution });
          }
        }
      }
    } catch {
      // Fall through to unauthorized
    }
  }

  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authenticated via API key — return first user's briefing
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: 'No user found' }, { status: 404 });
  }

  const contribution = await generateLocalBriefingContribution(user.id);
  return NextResponse.json({ contribution });
}
