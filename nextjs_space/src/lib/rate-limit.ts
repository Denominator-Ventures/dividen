/**
 * In-memory rate limiter for API routes.
 * Uses a sliding window counter per key (IP or userId).
 * Automatically cleans up expired entries every 60 seconds.
 *
 * Usage:
 *   const limiter = rateLimit({ windowMs: 60_000, max: 30 });
 *   const result = limiter.check(key);
 *   if (!result.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;  // time window in milliseconds
  max: number;       // max requests per window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(options: RateLimitOptions) {
  const store = new Map<string, RateLimitEntry>();

  // Cleanup every 60s
  if (typeof setInterval !== 'undefined') {
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (entry.resetAt <= now) store.delete(key);
      }
    }, 60_000);
    // Don't prevent Node from exiting
    if (timer?.unref) timer.unref();
  }

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || entry.resetAt <= now) {
        // New window
        store.set(key, { count: 1, resetAt: now + options.windowMs });
        return { allowed: true, remaining: options.max - 1, resetAt: now + options.windowMs };
      }

      entry.count++;
      if (entry.count > options.max) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
      }

      return { allowed: true, remaining: options.max - entry.count, resetAt: entry.resetAt };
    },

    /** Get rate limit headers for the response */
    headers(result: RateLimitResult): Record<string, string> {
      return {
        'X-RateLimit-Limit': String(options.max),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      };
    },
  };
}

// ─── Pre-configured limiters ───

/** General API: 60 req/min */
export const generalLimiter = rateLimit({ windowMs: 60_000, max: 60 });

/** Auth endpoints: 10 req/min (brute-force protection) */
export const authLimiter = rateLimit({ windowMs: 60_000, max: 10 });

/** Heavy endpoints (LLM, execute): 20 req/min */
export const heavyLimiter = rateLimit({ windowMs: 60_000, max: 20 });

/** Federation endpoints: 30 req/min per token */
export const federationLimiter = rateLimit({ windowMs: 60_000, max: 30 });

/**
 * Extract rate limit key from request.
 * Uses x-forwarded-for header (proxy), falling back to 'anonymous'.
 */
export function getRateLimitKey(req: Request, prefix = ''): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'anonymous';
  return prefix ? `${prefix}:${ip}` : ip;
}
