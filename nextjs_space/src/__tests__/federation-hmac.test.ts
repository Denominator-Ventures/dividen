/**
 * Tests: src/lib/federation-hmac.ts
 *
 * HMAC signing/verification for federated payloads. These tests are safety-critical
 * because HMAC failures cause inbound rejection of legitimate peers (or worse, let
 * forged payloads through).
 */
import { describe, it, expect } from 'vitest';
import { signPayload, verifyHmac, HMAC_HEADER } from '@/lib/federation-hmac';

describe('federation-hmac / signPayload', () => {
  it('produces a deterministic hex digest for the same body+secret', () => {
    const a = signPayload('{"relayId":"abc"}', 'shared-secret');
    const b = signPayload('{"relayId":"abc"}', 'shared-secret');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
  });

  it('produces different digests for different bodies', () => {
    const a = signPayload('{"x":1}', 'k');
    const b = signPayload('{"x":2}', 'k');
    expect(a).not.toBe(b);
  });

  it('produces different digests for different secrets', () => {
    const body = '{"x":1}';
    const a = signPayload(body, 'k1');
    const b = signPayload(body, 'k2');
    expect(a).not.toBe(b);
  });
});

describe('federation-hmac / verifyHmac', () => {
  it('verifies a valid signature', () => {
    const body = '{"hello":"world"}';
    const secret = 'federation-token-abc';
    const sig = signPayload(body, secret);
    expect(verifyHmac(body, sig, secret)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const body = '{"amount":100}';
    const secret = 's';
    const sig = signPayload(body, secret);
    expect(verifyHmac('{"amount":999}', sig, secret)).toBe(false);
  });

  it('rejects a wrong secret', () => {
    const body = '{"x":1}';
    const sig = signPayload(body, 'correct-key');
    expect(verifyHmac(body, sig, 'wrong-key')).toBe(false);
  });

  it('rejects malformed hex signatures without throwing', () => {
    const body = '{"x":1}';
    const secret = 'k';
    expect(verifyHmac(body, 'not-hex-at-all', secret)).toBe(false);
    expect(verifyHmac(body, '', secret)).toBe(false);
    expect(verifyHmac(body, 'abcd', secret)).toBe(false); // wrong length
  });

  it('exposes the expected header constant', () => {
    expect(HMAC_HEADER).toBe('x-federation-hmac');
  });
});
