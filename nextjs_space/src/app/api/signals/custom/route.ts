export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// GET — list custom signals for user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const signals = await prisma.customSignal.findMany({
      where: { userId: (session!.user as any).id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: signals });
  } catch (e: any) {
    console.error('GET /api/signals/custom error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST — create a custom signal (webhook/integration)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session!.user as any).id;

    const body = await req.json();
    const { name, icon, description, inboundDescription, triagePrompt, cardTypes, category } = body;

    if (!name || !description) {
      return NextResponse.json({ error: 'name and description are required' }, { status: 400 });
    }

    // Generate a slug-style signalId
    const signalId = `custom_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;

    // Generate webhook secret
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    // Build webhook URL (will be filled at runtime with NEXTAUTH_URL)
    const signal = await prisma.customSignal.create({
      data: {
        signalId,
        name,
        icon: icon || '🔔',
        description,
        inboundDescription: inboundDescription || `Incoming data from ${name}`,
        triagePrompt: triagePrompt || `Triage my ${name} signal. Review recent activity and:\n1. Identify action items and create kanban cards\n2. Flag anything urgent\n3. Queue any outbound actions for my approval\n4. Summarize what needs my attention.`,
        cardTypes: JSON.stringify(cardTypes || ['Action item', 'Follow-up', 'FYI']),
        category: category || 'data',
        webhookSecret,
        userId,
      },
    });

    // Also create a default SignalConfig for it
    const existingConfigs = await prisma.signalConfig.count({ where: { userId } });
    await prisma.signalConfig.create({
      data: {
        userId,
        signalId,
        priority: (existingConfigs + 1) * 10,
        catchUpEnabled: true,
        triageEnabled: true,
      },
    });

    return NextResponse.json({ success: true, data: signal });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A signal with that name already exists' }, { status: 409 });
    }
    console.error('POST /api/signals/custom error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
