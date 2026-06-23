import { Redis } from "@upstash/redis";

// Upstash uses REST calls instead of persistent TCP connections —
// required because Vercel serverless functions can't hold open connections.
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  // Next.js 14 App Router caches fetch() calls by default. Without this,
  // Redis GETs return stale cached responses and rate limit state never persists.
  cache: "no-store",
});
