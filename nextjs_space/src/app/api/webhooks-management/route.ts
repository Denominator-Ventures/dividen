import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateWebhookSecret, getWebhookUrl } from '@/lib/webhook-auth';

export const dynamic = 'force-dynamic';

// GET - List all webhooks for authenticated user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const webhooks = await prisma.webhook.findMany({
    where: { userId: userId },
    include: {
      _count: { select: { logs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get recent log stats for each webhook
  const webhooksWithStats = await Promise.all(
    webhooks.map(async (wh) => {
      const recentLogs = await prisma.webhookLog.findMany({
        where: { webhookId: wh.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { status: true, createdAt: true },
      });

      const successCount = recentLogs.filter(l => l.status === 'success').length;
      const errorCount = recentLogs.filter(l => l.status === 'error').length;
      const lastTriggered = recentLogs[0]?.createdAt || null;

      return {
        id: wh.id,
        name: wh.name,
        type: wh.type,
        isActive: wh.isActive,
        url: getWebhookUrl(wh.id, wh.type, wh.secret),
        secret: wh.secret,
        mappingRules: wh.mappingRules,
        totalLogs: wh._count.logs,
        recentSuccess: successCount,
        recentErrors: errorCount,
        lastTriggered,
        createdAt: wh.createdAt,
      };
    })
  );

  return NextResponse.json({ success: true, data: webhooksWithStats });
}

// POST - Create a new webhook
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, type, mappingRules } = body;

  if (!name || !type) {
    return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
  }

  const validTypes = ['calendar', 'email', 'transcript', 'generic'];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `Type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
  }

  const secret = generateWebhookSecret();

  const webhook = await prisma.webhook.create({
    data: {
      name,
      type,
      secret,
      mappingRules: mappingRules ? JSON.stringify(mappingRules) : null,
      userId: userId,
    },
  });

  // Set the URL after creation (includes webhookId)
  await prisma.webhook.update({
    where: { id: webhook.id },
    data: { url: getWebhookUrl(webhook.id, type, secret) },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: webhook.id,
      name: webhook.name,
      type: webhook.type,
      isActive: webhook.isActive,
      url: getWebhookUrl(webhook.id, type, secret),
      secret,
      createdAt: webhook.createdAt,
    },
  });
}
