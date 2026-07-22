import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { publishClickEvent } from "@/lib/kafka";

const CACHE_TTL_SECONDS = 3600; // 1 hour

type CachedUrl = { id: number; longUrl: string };

// notFound() from next/navigation only renders app/not-found.tsx when thrown
// from a page/layout render — inside a Route Handler it just produces an
// empty 404 body. This mirrors that page's markup by hand so a dead short
// link still gets the same branded response, not a blank one.
const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charSet="utf-8" /><title>URL Shortener</title></head>
<body style="font-family: system-ui, sans-serif; margin: 0">
  <main style="max-width: 480px; margin: 80px auto; padding: 0 16px; text-align: center">
    <h1 style="font-size: 24px; margin-bottom: 8px">Link not found</h1>
    <p style="color: #666">This short link doesn't exist or may have been removed.</p>
    <a href="/" style="color: #111; text-decoration: underline">Go back home</a>
  </main>
</body>
</html>`;

function notFoundResponse() {
  return new NextResponse(NOT_FOUND_HTML, {
    status: 404,
    headers: { "Content-Type": "text/html" },
  });
}

// A route handler rather than a page — attaching the X-Cache header to the
// redirect response (for the system-health demo) requires returning a
// NextResponse directly, which a page component's redirect() can't do.
export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  const cacheKey = `shorturl:${params.code}`;

  // Cache-aside pattern: check Redis first. On a hit, we get both the id and
  // longUrl from the cached value itself — zero Postgres queries on a hit.
  const cached = await redis.get<CachedUrl>(cacheKey);

  let urlId: number;
  let longUrl: string;
  let cacheStatus: "HIT" | "MISS";

  if (cached) {
    urlId = cached.id;
    longUrl = cached.longUrl;
    cacheStatus = "HIT";
  } else {
    // Cache miss — go to Postgres, then populate the cache for next time.
    const url = await db.url.findUnique({ where: { shortCode: params.code } });
    if (!url) {
      return notFoundResponse();
    }
    urlId = url.id;
    longUrl = url.longUrl;
    cacheStatus = "MISS";
    await redis.set(cacheKey, { id: url.id, longUrl: url.longUrl }, { ex: CACHE_TTL_SECONDS });
  }

  db.url
    .update({ where: { id: urlId }, data: { clickCount: { increment: 1 } } })
    .catch(() => {});

  publishClickEvent({
    shortCode: params.code,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  const response = NextResponse.redirect(longUrl, 307);
  response.headers.set("X-Cache", cacheStatus);
  return response;
}
