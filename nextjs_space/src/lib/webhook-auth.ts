// ─── Webhook Authentication Middleware ─────────────────────────────────────
// Validates incoming webhook requests using HMAC-SHA256 or simple secret

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface WebhookAuthResult {
  valid: boolean;
  webhookId: string | null;
  userId: string | null;
  error?: string;
}

/**
 * Verify HMAC-SHA256 signature from request headers
 */
export function verifyHmacSignature(
  payload: string,
  secret: string,
  signature: string
): boolean {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  // Support both raw hex and "sha256=..." prefixed formats
  const cleaned = signature.startsWith('sha256=')
    ? signature.slice(7)
    : signature;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(cleaned, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Authenticate a webhook request.
 * Supports:
 *   1. Header-based secret: X-Webhook-Secret
 *   2. HMAC signature: X-Webhook-Signature (sha256=<hex>)
 *   3. Query param: ?secret=<value>
 */
export async function authenticateWebhook(
  req: NextRequest,
  webhookType: string
): Promise<WebhookAuthResult> {
  // Extract secret from headers or query params
  const headerSecret = req.headers.get('x-webhook-secret');
  const headerSignature = req.headers.get('x-webhook-signature');
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get('secret');
  const queryWebhookId = searchParams.get('webhookId');

  const secret = headerSecret || querySecret;

  // If we have a specific webhookId, look it up directly
  if (queryWebhookId) {
    const webhook = await prisma.webhook.findFirst({
      where: { id: queryWebhookId, type: webhookType, isActive: true },
    });

    if (!webhook) {
      return { valid: false, webhookId: null, userId: null, error: 'Webhook not found or inactive' };
    }

    // Validate secret or signature
    if (headerSignature) {
      const body = await cloneRequestBody(req);
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

  // Otherwise, look up by secret + type
  if (secret) {
    const webhook = await prisma.webhook.findFirst({
      where: { secret, type: webhookType, isActive: true },
    });

    if (!webhook) {
      return { valid: false, webhookId: null, userId: null, error: 'Invalid secret or webhook inactive' };
    }

    return { valid: true, webhookId: webhook.id, userId: webhook.userId };
  }

  // Try HMAC signature-based lookup (need to check all active webhooks of this type)
  if (headerSignature) {
    const body = await cloneRequestBody(req);
    const webhooks = await prisma.webhook.findMany({
      where: { type: webhookType, isActive: true },
    });

    for (const webhook of webhooks) {
      if (verifyHmacSignature(body, webhook.secret, headerSignature)) {
        return { valid: true, webhookId: webhook.id, userId: webhook.userId };
      }
    }

    return { valid: false, webhookId: null, userId: null, error: 'Invalid signature' };
  }

  return { valid: false, webhookId: null, userId: null, error: 'No authentication provided' };
}

/**
 * Helper to clone request body text for signature verification
 * (since body can only be read once)
 */
async function cloneRequestBody(req: NextRequest): Promise<string> {
  try {
    return await req.text();
  } catch {
    return '';
  }
}

/**
 * Log a webhook request to the database
 */
export async function logWebhookRequest(
  webhookId: string,
  payload: string,
  status: 'success' | 'error' | 'ignored',
  statusCode: number = 200,
  error?: string,
  actionsRun?: string[]
) {
  try {
    await prisma.webhookLog.create({
      data: {
        webhookId,
        payload: payload.substring(0, 10000), // Limit payload size
        status,
        statusCode,
        error: error?.substring(0, 2000),
        actionsRun: actionsRun ? JSON.stringify(actionsRun) : null,
      },
    });
  } catch (err) {
    console.error('[Webhook Log Error]', err);
  }
}

/**
 * Generate a secure random secret for a new webhook
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Generate the full webhook URL for a given webhook
 */
export function getWebhookUrl(webhookId: string, webhookType: string, secret: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/api/webhooks/${webhookType}?webhookId=${webhookId}&secret=${secret}`;
}
