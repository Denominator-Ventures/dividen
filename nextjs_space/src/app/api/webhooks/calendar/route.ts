import { NextRequest, NextResponse } from 'next/server';
import { authenticateWebhook, logWebhookRequest } from '@/lib/webhook-auth';
import { processCalendarEvent, MappingRule } from '@/lib/webhook-actions';
import { parseMappingConfig, learnAndSaveMapping } from '@/lib/webhook-learn';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let bodyText = '';
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const auth = await authenticateWebhookFromBody(req, 'calendar', bodyText);

  if (!auth.valid || !auth.webhookId || !auth.userId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    await logWebhookRequest(auth.webhookId, bodyText, 'error', 400, 'Invalid JSON payload');
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // Parse mapping config — could be new fieldMap format or legacy MappingRule[]
  const webhook = await prisma.webhook.findUnique({ where: { id: auth.webhookId } });
  let mappingRules: MappingRule[] | undefined;
  let fieldMap: Record<string, string> | undefined;
  const config = parseMappingConfig(webhook?.mappingRules || null);

  if (config?.fieldMap) {
    fieldMap = config.fieldMap;
  } else if (webhook?.mappingRules) {
    try {
      const parsed = JSON.parse(webhook.mappingRules);
      if (Array.isArray(parsed)) mappingRules = parsed;
    } catch { /* use defaults */ }
  }

  const results = await processCalendarEvent(payload, auth.userId, mappingRules, fieldMap);
  const hasErrors = results.some(r => !r.success);

  // Trigger auto-learn in background if no mapping exists yet
  if (!config && !mappingRules) {
    learnAndSaveMapping(auth.webhookId, payload, 'calendar').catch(() => {});
  }

  await logWebhookRequest(
    auth.webhookId,
    bodyText,
    hasErrors ? 'error' : 'success',
    hasErrors ? 500 : 200,
    hasErrors ? results.filter(r => !r.success).map(r => r.error).join('; ') : undefined,
    results.map(r => r.action)
  );

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
  });
}

// Helper that works with already-consumed body
async function authenticateWebhookFromBody(
  req: NextRequest,
  type: string,
  body: string
) {
  const headerSecret = req.headers.get('x-webhook-secret');
  const headerSignature = req.headers.get('x-webhook-signature');
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get('secret');
  const queryWebhookId = searchParams.get('webhookId');
  const secret = headerSecret || querySecret;

  const { authenticateWebhook: _unused, verifyHmacSignature, ...rest } = await import('@/lib/webhook-auth');

  if (queryWebhookId) {
    const webhook = await prisma.webhook.findFirst({
      where: { id: queryWebhookId, type, isActive: true },
    });
    if (!webhook) return { valid: false, webhookId: null, userId: null, error: 'Webhook not found or inactive' };

    if (headerSignature) {
      if (!verifyHmacSignature(body, webhook.secret, headerSignature)) {
        return { valid: false, webhookId: webhook.id, userId: null, error: 'Invalid signature' };
      }
    } else if (secret) {
      if (secret !== webhook.secret) {
        return { valid: false, webhookId: webhook.id, userId: null, error: 'Invalid secret' };
      }
    } else {
      return { valid: false, webhookId: null, userId: null, error: 'No authentication provided' };
    }
    return { valid: true, webhookId: webhook.id, userId: webhook.userId };
  }

  if (secret) {
    const webhook = await prisma.webhook.findFirst({ where: { secret, type, isActive: true } });
    if (!webhook) return { valid: false, webhookId: null, userId: null, error: 'Invalid secret' };
    return { valid: true, webhookId: webhook.id, userId: webhook.userId };
  }

  if (headerSignature) {
    const webhooks = await prisma.webhook.findMany({ where: { type, isActive: true } });
    for (const webhook of webhooks) {
      if (verifyHmacSignature(body, webhook.secret, headerSignature)) {
        return { valid: true, webhookId: webhook.id, userId: webhook.userId };
      }
    }
    return { valid: false, webhookId: null, userId: null, error: 'Invalid signature' };
  }

  return { valid: false, webhookId: null, userId: null, error: 'No authentication provided' };
}
