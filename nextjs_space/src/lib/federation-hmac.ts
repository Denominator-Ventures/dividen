/**
 * DiviDen Federation HMAC (v2.4.0)
 *
 * Provides HMAC-SHA256 signing and verification for federation payloads.
 * Feature-flagged per-connection via Connection.hmacEnabled.
 *
 * Protocol:
 *   Outbound: sign the JSON-stringified request body with the connection's
 *             federationToken as the HMAC key. Send the hex digest as
 *             `x-federation-hmac` header.
 *
 *   Inbound:  if the connection has hmacEnabled=true, verify the
 *             `x-federation-hmac` header against the request body.
 *             If verification fails, reject with 401.
 *             If hmacEnabled=false, skip verification (backwards-compatible).
 *
 * The federationToken serves dual duty: it's both the bearer token
 * (x-federation-token) and the HMAC key. This avoids adding a second
 * secret to the connection handshake.
 */

import { createHmac, timingSafeEqual } from 'crypto';

const ALGORITHM = 'sha256';
export const HMAC_HEADER = 'x-federation-hmac';

/**
 * Sign a JSON body string with a shared secret.
 * Returns a hex-encoded HMAC-SHA256 digest.
 */
export function signPayload(body: string, secret: string): string {
  return createHmac(ALGORITHM, secret).update(body, 'utf8').digest('hex');
}

/**
 * Verify an HMAC signature against a body and secret.
 * Uses timing-safe comparison to prevent timing attacks.
 * Returns true if valid, false otherwise.
 */
export function verifyHmac(body: string, signature: string, secret: string): boolean {
  try {
    const expected = signPayload(body, secret);
    // Both are hex strings — convert to buffers for timing-safe comparison
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}
