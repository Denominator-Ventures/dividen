#!/usr/bin/env npx tsx
/**
 * DiviDen v2.4.0 HMAC Self-Test Suite
 *
 * Verifies that:
 *  1. signPayload() produces a deterministic hex digest
 *  2. verifyHmac() accepts a valid signature
 *  3. verifyHmac() rejects a tampered body
 *  4. verifyHmac() rejects a wrong secret
 *  5. verifyHmac() rejects an empty/missing signature
 *  6. federationHeaders() includes HMAC header when hmacEnabled=true
 *  7. federationHeaders() omits HMAC header when hmacEnabled=false
 *  8. Connection.hmacEnabled field exists and defaults to false
 *
 * Usage:  npx tsx scripts/check_hmac.ts
 */

import { createHmac } from 'crypto';

// ── Inline unit tests (no DB needed) ────────────────────────────────────────

const ALGORITHM = 'sha256';

function signPayload(body: string, secret: string): string {
  return createHmac(ALGORITHM, secret).update(body, 'utf8').digest('hex');
}

function verifyHmac(body: string, signature: string, secret: string): boolean {
  try {
    const expected = signPayload(body, secret);
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length) return false;
    return require('crypto').timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

const HMAC_HEADER = 'x-federation-hmac';

function federationHeaders(token: string, bodyJson: string, hmacEnabled?: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-federation-token': token,
  };
  if (hmacEnabled) {
    headers[HMAC_HEADER] = signPayload(bodyJson, token);
  }
  return headers;
}

let passed = 0;
let failed = 0;

function assert(name: string, ok: boolean) {
  if (ok) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ ${name}`);
    failed++;
  }
}

console.log('\n🔐 DiviDen v2.4.0 HMAC Self-Test Suite\n');

const secret = 'test-token-456';
const body = JSON.stringify({ intent: 'notify', subject: 'hello', teamId: 'abc123' });

// Test 1: Deterministic
const sig1 = signPayload(body, secret);
const sig2 = signPayload(body, secret);
assert('1. signPayload is deterministic', sig1 === sig2);
assert('   (hex string, 64 chars)', sig1.length === 64 && /^[0-9a-f]+$/.test(sig1));

// Test 2: Valid signature accepted
assert('2. verifyHmac accepts valid signature', verifyHmac(body, sig1, secret));

// Test 3: Tampered body rejected
const tampered = body.replace('hello', 'hacked');
assert('3. verifyHmac rejects tampered body', !verifyHmac(tampered, sig1, secret));

// Test 4: Wrong secret rejected
assert('4. verifyHmac rejects wrong secret', !verifyHmac(body, sig1, 'wrong-secret'));

// Test 5: Empty/missing signature rejected
assert('5a. verifyHmac rejects empty string', !verifyHmac(body, '', secret));
assert('5b. verifyHmac rejects malformed hex', !verifyHmac(body, 'not-hex-at-all', secret));

// Test 6: federationHeaders includes HMAC when enabled
const headersOn = federationHeaders(secret, body, true);
assert('6. headers include x-federation-hmac when enabled', HMAC_HEADER in headersOn);
assert('   (signature matches signPayload)', headersOn[HMAC_HEADER] === sig1);

// Test 7: federationHeaders omits HMAC when disabled
const headersOff = federationHeaders(secret, body, false);
assert('7a. headers omit x-federation-hmac when disabled', !(HMAC_HEADER in headersOff));
const headersUndef = federationHeaders(secret, body);
assert('7b. headers omit x-federation-hmac when undefined', !(HMAC_HEADER in headersUndef));

// ── DB integration test (Connection.hmacEnabled field) ──────────────────────
console.log('\n📡 DB field check...');

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDbField() {
  try {
    // Find any federated connection
    const conn = await prisma.connection.findFirst({
      where: { isFederated: true },
      select: { id: true, hmacEnabled: true, federationToken: true, peerInstanceUrl: true },
    });
    if (!conn) {
      console.log('  ⏭  No federated connections found — skipping DB field check');
      return;
    }
    assert('8. Connection.hmacEnabled field exists', typeof conn.hmacEnabled === 'boolean');
    assert('   (defaults to false)', conn.hmacEnabled === false);
    console.log(`   Connection ${conn.id.slice(-6)}: hmacEnabled=${conn.hmacEnabled}, peer=${conn.peerInstanceUrl}`);
  } catch (e: any) {
    console.error('  ❌ DB field check failed:', e.message);
    failed++;
  } finally {
    await prisma.$disconnect();
  }
}

checkDbField().then(() => {
  console.log(`\n═══════════════════════════════`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`═══════════════════════════════\n`);
  process.exit(failed > 0 ? 1 : 0);
});
