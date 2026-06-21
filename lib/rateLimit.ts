import { redis } from "@/lib/redis";

// Token bucket algorithm:
// Each identifier (IP/user) has a "bucket" holding up to CAPACITY tokens.
// Every request costs 1 token. Tokens refill at REFILL_RATE per second.
// If the bucket is empty, the request is rejected.
// This allows short bursts (up to full capacity) while still enforcing a
// steady average rate over time — friendlier than a hard fixed-window limit.

const CAPACITY = 10; // max burst size
const REFILL_RATE = 1; // tokens added per second (~1 req/sec sustained)

// NOTE: this read-then-write isn't atomic — under heavy concurrent traffic from
// the same IP, two requests could both read the same token count before either
// writes back, slightly over-allowing. A production system would use a Redis
// Lua script (EVAL) to make the read-modify-write atomic. Left as a simplification
// here, but worth knowing/mentioning — it's a real follow-up question interviewers ask.

export async function checkRateLimit(
  identifier: string
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();

  const bucket = await redis.get<{ tokens: number; lastRefill: number }>(key);

  let tokens = bucket?.tokens ?? CAPACITY;
  const lastRefill = bucket?.lastRefill ?? now;

  // Refill based on elapsed time since last request
  const elapsedSeconds = (now - lastRefill) / 1000;
  tokens = Math.min(CAPACITY, tokens + elapsedSeconds * REFILL_RATE);

  if (tokens < 1) {
    await redis.set(key, { tokens, lastRefill: now }, { ex: 60 });
    return { allowed: false, remaining: 0 };
  }

  tokens -= 1;
  await redis.set(key, { tokens, lastRefill: now }, { ex: 60 });

  return { allowed: true, remaining: Math.floor(tokens) };
}
