import { redis } from "@/lib/redis";

// Fixed-window counter rate limiter using Redis INCR.
//
// Why this instead of the token bucket read-modify-write approach:
// INCR is a single atomic Redis operation — there's no window between
// read and write where concurrent requests can race. The previous token
// bucket implementation had a race condition: 20 parallel requests could
// all read the same count before any wrote back, making the limit useless.
//
// Trade-off: fixed windows allow a burst at the boundary (up to 2× limit
// if requests hit the last second of one window and first of the next).
// Token bucket is smoother but requires a Lua script for atomicity in Redis.
// For a portfolio project, atomic fixed-window is the right call.

const MAX_REQUESTS = 10; // per window
const WINDOW_SECONDS = 10; // rolling window size

export async function checkRateLimit(
  identifier: string
): Promise<{ allowed: boolean; remaining: number }> {
  const window = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const key = `ratelimit:${identifier}:${window}`;

  // INCR is atomic — no race condition possible here.
  const count = await redis.incr(key);

  // Set expiry only on first request in this window so the key auto-cleans.
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS * 2);
  }

  const allowed = count <= MAX_REQUESTS;
  const remaining = Math.max(0, MAX_REQUESTS - count);

  return { allowed, remaining };
}