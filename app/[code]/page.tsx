import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { publishClickEvent } from "@/lib/kafka";
import { redirect, notFound } from "next/navigation";

const CACHE_TTL_SECONDS = 3600; // 1 hour

type CachedUrl = { id: number; longUrl: string };

export default async function RedirectPage({
  params,
}: {
  params: { code: string };
}) {
  const cacheKey = `shorturl:${params.code}`;

  // Cache-aside pattern: check Redis first. On a hit, we get both the id and
  // longUrl from the cached value itself — zero Postgres queries on a hit.
  const cached = await redis.get<CachedUrl>(cacheKey);

  let urlId: number;
  let longUrl: string;

  if (cached) {
    urlId = cached.id;
    longUrl = cached.longUrl;
  } else {
    // Cache miss — go to Postgres, then populate the cache for next time.
    const url = await db.url.findUnique({ where: { shortCode: params.code } });
    if (!url) {
      notFound();
    }
    urlId = url.id;
    longUrl = url.longUrl;
    await redis.set(cacheKey, { id: url.id, longUrl: url.longUrl }, { ex: CACHE_TTL_SECONDS });
  }

  db.url
    .update({ where: { id: urlId }, data: { clickCount: { increment: 1 } } })
    .catch(() => {});

  publishClickEvent({
    shortCode: params.code,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  redirect(longUrl);
}
