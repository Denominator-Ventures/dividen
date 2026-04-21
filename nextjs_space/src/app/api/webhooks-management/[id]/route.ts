import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getWebhookUrl } from '@/lib/webhook-auth';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

// GET - Get single webhook details
async function _GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const webhook = await prisma.webhook.findFirst({
    where: { id: params.id, userId: userId },
    include: { _count: { select: { logs: true } } },
  });

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...webhook,
      url: getWebhookUrl(webhook.id, webhook.type, webhook.secret),
    },
  });
}

// PATCH - Update webhook
async function _PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const existing = await prisma.webhook.findFirst({
    where: { id: params.id, userId: userId },
  });
  if (!existing) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.mappingRules !== undefined) {
    updateData.mappingRules = body.mappingRules ? JSON.stringify(body.mappingRules) : null;
  }

  const webhook = await prisma.webhook.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json({
    success: true,
    data: {
      id: webhook.id,
      name: webhook.name,
      type: webhook.type,
      isActive: webhook.isActive,
      url: getWebhookUrl(webhook.id, webhook.type, webhook.secret),
      secret: webhook.secret,
      mappingRules: webhook.mappingRules,
    },
  });
}

// DELETE - Delete webhook
async function _DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const existing = await prisma.webhook.findFirst({
    where: { id: params.id, userId: userId },
  });
  if (!existing) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

  await prisma.webhook.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}

export const GET = withTelemetry(_GET);
export const PATCH = withTelemetry(_PATCH);
export const DELETE = withTelemetry(_DELETE);
