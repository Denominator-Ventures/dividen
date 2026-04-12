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
    const { name, icon, description, inboundDescription, triagePrompt, cardTypes, taskTypes, category } = body;

    if (!name || !description) {
      return NextResponse.json({ error: 'name and description are required' }, { status: 400 });
    }

    // Generate a slug-style signalId
    const signalId = `custom_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;

    // Generate webhook secret
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    // Default task-first triage prompt for custom signals
    const defaultTriagePrompt = `Triage my ${name} signal. Every item is a potential task.\n\n1. **EXTRACT TASKS**: What needs to happen from each item?\n2. **ROUTE**: Find the right project card on my Board for each task. Add as a checklist item with source context (sourceType: "${signalId}").\n3. **LINK**: Connect artifacts using [[link_artifact:{"type":"${signalId}","artifactId":"...","label":"..."}]]\n4. **NEW PROJECT**: Only for genuinely new initiatives. Name it as a project, not a task.\n5. **LEARN**: Save routing patterns with [[save_learning:{}]]\n6. Summarize: 📋 Tasks routed | 🆕 New projects | 🔗 Artifacts linked | ⏭️ Skipped`;

    const signal = await prisma.customSignal.create({
      data: {
        signalId,
        name,
        icon: icon || '🔔',
        description,
        inboundDescription: inboundDescription || `Incoming data from ${name}`,
        triagePrompt: triagePrompt || defaultTriagePrompt,
        cardTypes: JSON.stringify(taskTypes || cardTypes || ['Extract tasks', 'Route to project', 'Follow up']),
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
