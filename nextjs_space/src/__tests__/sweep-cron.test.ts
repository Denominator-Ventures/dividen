/**
 * Tests: src/app/api/cron/sweep/route.ts (auth contract only)
 *
 * Full sweep execution hits the live DB and mutates rows; we don't run that in
 * unit tests. Instead we verify the auth contract — which is the single most
 * important property. If auth breaks, a malicious caller could trigger
 * production side-effects.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { POST } from '@/app/api/cron/sweep/route';

function makeReq(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/cron/sweep', {
    method: 'POST',
    headers,
  }) as any;
}

describe('cron/sweep / auth', () => {
  beforeAll(() => {
    // Ensure ADMIN_PASSWORD is set to a known value for auth tests
    if (!process.env.ADMIN_PASSWORD) {
      process.env.ADMIN_PASSWORD = 'test-admin-pass-for-vitest';
    }
  });

  it('rejects requests with no auth headers', async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it('rejects requests with a wrong bearer token', async () => {
    const res = await POST(makeReq({ authorization: 'Bearer completely-wrong' }));
    expect(res.status).toBe(401);
  });

  it('rejects requests with a wrong x-cron-secret', async () => {
    const res = await POST(makeReq({ 'x-cron-secret': 'completely-wrong' }));
    expect(res.status).toBe(401);
  });

  // Note: we deliberately do NOT test the happy path (200) here — that would
  // mutate the shared dev/prod DB. Happy-path verification lives in the
  // manual `npx tsx scripts/check_hmac.ts`-style suites.
});
