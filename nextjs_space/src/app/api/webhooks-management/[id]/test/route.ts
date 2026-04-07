import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logWebhookRequest } from '@/lib/webhook-auth';
import {
  processCalendarEvent,
  processEmailEvent,
  processTranscriptEvent,
  processGenericEvent,
  MappingRule,
} from '@/lib/webhook-actions';

export const dynamic = 'force-dynamic';

// POST - Test a webhook with sample payload
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const webhook = await prisma.webhook.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!webhook) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = body.payload || body;

  let mappingRules: MappingRule[] | undefined;
  if (webhook.mappingRules) {
    try { mappingRules = JSON.parse(webhook.mappingRules); } catch { /* defaults */ }
  }

  let results;
  switch (webhook.type) {
    case 'calendar':
      results = await processCalendarEvent(payload, user.id, mappingRules);
      break;
    case 'email':
      results = await processEmailEvent(payload, user.id, mappingRules);
      break;
    case 'transcript':
      results = await processTranscriptEvent(payload, user.id, mappingRules);
      break;
    case 'generic':
    default:
      results = await processGenericEvent(payload, user.id, mappingRules);
      break;
  }

  const hasErrors = results.some(r => !r.success);

  await logWebhookRequest(
    webhook.id,
    JSON.stringify(payload),
    hasErrors ? 'error' : 'success',
    hasErrors ? 500 : 200,
    hasErrors ? results.filter(r => !r.success).map(r => r.error).join('; ') : 'Test webhook',
    results.map(r => r.action)
  );

  return NextResponse.json({
    success: true,
    test: true,
    processed: results.length,
    results,
  });
}
