import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzePayload, learnAndSaveMapping, parseMappingConfig } from '@/lib/webhook-learn';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

// POST - Trigger Divi auto-learn from a sample payload or latest log
async function _POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const webhook = await prisma.webhook.findFirst({
    where: { id: params.id, userId: userId },
  });
  if (!webhook) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let payload = body.payload;

  // If no payload provided, use the latest successful log entry
  if (!payload) {
    const latestLog = await prisma.webhookLog.findFirst({
      where: { webhookId: webhook.id, status: 'success' },
      orderBy: { createdAt: 'desc' },
    });
    if (latestLog?.payload) {
      try {
        payload = JSON.parse(latestLog.payload);
      } catch { /* skip */ }
    }
  }

  if (!payload) {
    return NextResponse.json(
      { error: 'No payload available to learn from. Send a test payload first.' },
      { status: 400 }
    );
  }

  const mapping = await learnAndSaveMapping(webhook.id, payload, webhook.type);

  if (!mapping) {
    return NextResponse.json(
      { error: 'Could not learn mapping. Ensure an API key is configured in Settings.' },
      { status: 422 }
    );
  }

  return NextResponse.json({
    success: true,
    mapping,
    message: `Divi learned ${Object.keys(mapping.fieldMap).length} field mappings with ${mapping.confidence} confidence.`,
  });
}

// GET - Get current mapping config
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
    select: { id: true, type: true, mappingRules: true },
  });
  if (!webhook) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

  const config = parseMappingConfig(webhook.mappingRules);

  return NextResponse.json({
    success: true,
    webhookType: webhook.type,
    mapping: config,
    hasMapping: !!config,
  });
}

export const GET = withTelemetry(_GET);
export const POST = withTelemetry(_POST);
