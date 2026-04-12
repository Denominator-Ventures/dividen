export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SIGNAL_DEFINITIONS } from '@/lib/signals';

// GET — return user's signal configs merged with defaults for all known signals
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session!.user as any).id;

    // Fetch existing configs
    const configs = await prisma.signalConfig.findMany({ where: { userId } });
    const configMap = new Map(configs.map(c => [c.signalId, c]));

    // Fetch custom signals
    const customSignals = await prisma.customSignal.findMany({
      where: { userId, isActive: true },
    });

    // Build merged list: hardcoded signals + custom signals, with user overrides
    const allSignalIds = [
      ...SIGNAL_DEFINITIONS.map(s => s.id),
      ...customSignals.map(s => s.signalId),
    ];

    const merged = allSignalIds.map((signalId, index) => {
      const existing = configMap.get(signalId);
      const builtIn = SIGNAL_DEFINITIONS.find(s => s.id === signalId);
      const custom = customSignals.find(s => s.signalId === signalId);
      return {
        signalId,
        name: builtIn?.name || custom?.name || signalId,
        icon: builtIn?.icon || custom?.icon || '🔔',
        category: builtIn?.category || custom?.category || 'data',
        isCustom: !builtIn,
        priority: existing?.priority ?? (index + 1) * 10,
        catchUpEnabled: existing?.catchUpEnabled ?? true,
        triageEnabled: existing?.triageEnabled ?? true,
      };
    });

    // Sort by priority
    merged.sort((a, b) => a.priority - b.priority);

    return NextResponse.json({ success: true, data: merged });
  } catch (e: any) {
    console.error('GET /api/signals/config error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT — bulk update signal configs (expects array of { signalId, priority, catchUpEnabled, triageEnabled })
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session!.user as any).id;

    const body = await req.json();
    const configs: { signalId: string; priority: number; catchUpEnabled: boolean; triageEnabled: boolean }[] = body.configs;

    if (!Array.isArray(configs)) {
      return NextResponse.json({ error: 'configs must be an array' }, { status: 400 });
    }

    // Upsert each config
    await Promise.all(
      configs.map(c =>
        prisma.signalConfig.upsert({
          where: { userId_signalId: { userId, signalId: c.signalId } },
          create: {
            userId,
            signalId: c.signalId,
            priority: c.priority,
            catchUpEnabled: c.catchUpEnabled,
            triageEnabled: c.triageEnabled,
          },
          update: {
            priority: c.priority,
            catchUpEnabled: c.catchUpEnabled,
            triageEnabled: c.triageEnabled,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('PUT /api/signals/config error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
