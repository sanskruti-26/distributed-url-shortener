import { Redis } from "@upstash/redis";

// Upstash uses REST calls instead of persistent TCP connections —
// required because Vercel serverless functions can't hold open connections.
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
