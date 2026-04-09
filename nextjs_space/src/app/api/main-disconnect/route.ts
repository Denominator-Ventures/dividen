export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgent, isAuthError, AgentContext } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

/**
 * DEP-006: Connection Ceremony — Disconnection
 *
 * POST /api/main-disconnect
 * Graceful disconnection of an execution agent.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateAgent(req);
  if (isAuthError(auth)) return auth;
  const agent = auth as AgentContext;
  const userId = agent.userId;

  try {
    // Deactivate instance registries
    await prisma.instanceRegistry.updateMany({
      where: { isActive: true, apiKey: req.headers.get('authorization')?.slice(7) || '' },
      data: { isActive: false },
    });

    // Cancel pending agent relays
    await prisma.agentRelay.updateMany({
      where: {
        fromUserId: userId,
        status: { in: ['pending', 'delivered', 'agent_handling'] },
        intent: 'assign_task',
      },
      data: { status: 'declined', resolvedAt: new Date() },
    });

    // Deactivate the API key that was used
    await prisma.externalApiKey.update({
      where: { id: agent.keyId },
      data: { isActive: false },
    });

    // Log disconnection
    await prisma.commsMessage.create({
      data: {
        sender: 'system',
        content: `🔌 [SYSTEM] Agent disconnected: ${agent.keyName}`,
        state: 'new',
        priority: 'normal',
        userId,
        metadata: JSON.stringify({ type: 'agent_disconnection', keyName: agent.keyName }),
      },
    });

    return NextResponse.json({ status: 'disconnected' });
  } catch (error: any) {
    console.error('POST /api/main-disconnect error:', error);
    return NextResponse.json({ error: error.message || 'Disconnection failed' }, { status: 500 });
  }
}
