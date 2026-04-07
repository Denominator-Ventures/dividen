import { NextRequest, NextResponse } from 'next/server';
import { verifyHmacSignature, logWebhookRequest } from '@/lib/webhook-auth';
import { processEmailEvent, MappingRule } from '@/lib/webhook-actions';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let bodyText = '';
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const auth = await authenticateFromBody(req, 'email', bodyText);
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

  const webhook = await prisma.webhook.findUnique({ where: { id: auth.webhookId } });
  let mappingRules: MappingRule[] | undefined;
  if (webhook?.mappingRules) {
    try { mappingRules = JSON.parse(webhook.mappingRules); } catch { /* defaults */ }
  }

  const results = await processEmailEvent(payload, auth.userId, mappingRules);
  const hasErrors = results.some(r => !r.success);

  await logWebhookRequest(
    auth.webhookId, bodyText,
    hasErrors ? 'error' : 'success',
    hasErrors ? 500 : 200,
    hasErrors ? results.filter(r => !r.success).map(r => r.error).join('; ') : undefined,
    results.map(r => r.action)
  );

  return NextResponse.json({ success: true, processed: results.length, results });
}

async function authenticateFromBody(req: NextRequest, type: string, body: string) {
  const headerSecret = req.headers.get('x-webhook-secret');
  const headerSignature = req.headers.get('x-webhook-signature');
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get('secret');
  const queryWebhookId = searchParams.get('webhookId');
  const secret = headerSecret || querySecret;

  if (queryWebhookId) {
    const webhook = await prisma.webhook.findFirst({ where: { id: queryWebhookId, type, isActive: true } });
    if (!webhook) return { valid: false, webhookId: null, userId: null, error: 'Webhook not found' };
    if (headerSignature) {
      if (!verifyHmacSignature(body, webhook.secret, headerSignature)) return { valid: false, webhookId: webhook.id, userId: null, error: 'Invalid signature' };
    } else if (secret) {
      if (secret !== webhook.secret) return { valid: false, webhookId: webhook.id, userId: null, error: 'Invalid secret' };
    } else return { valid: false, webhookId: null, userId: null, error: 'No auth' };
    return { valid: true, webhookId: webhook.id, userId: webhook.userId };
  }
  if (secret) {
    const webhook = await prisma.webhook.findFirst({ where: { secret, type, isActive: true } });
    if (!webhook) return { valid: false, webhookId: null, userId: null, error: 'Invalid secret' };
    return { valid: true, webhookId: webhook.id, userId: webhook.userId };
  }
  if (headerSignature) {
    const webhooks = await prisma.webhook.findMany({ where: { type, isActive: true } });
    for (const wh of webhooks) {
      if (verifyHmacSignature(body, wh.secret, headerSignature)) return { valid: true, webhookId: wh.id, userId: wh.userId };
    }
    return { valid: false, webhookId: null, userId: null, error: 'Invalid signature' };
  }
  return { valid: false, webhookId: null, userId: null, error: 'No auth' };
}
