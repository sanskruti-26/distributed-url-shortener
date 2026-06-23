import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encodeBase62 } from "@/lib/shortcode";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateUrl } from "@/lib/validateUrl";

export async function POST(req: NextRequest) {
  // Rate limit per IP using a token bucket. Vercel sets x-forwarded-for.
const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0] ||
  req.headers.get("x-real-ip") ||
  "local-test";  const { allowed } = await checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const longUrl = body?.longUrl;

  if (!longUrl || typeof longUrl !== "string") {
    return NextResponse.json({ error: "longUrl is required" }, { status: 400 });
  }

  const { valid, reason } = validateUrl(longUrl);
  if (!valid) {
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  try {
    // Step 1: insert with a unique temporary placeholder to get an auto-increment id.
    // Using crypto.randomUUID() here (not a shared "" value) avoids a race condition
    // where two concurrent requests both try to insert shortCode: "" and collide on
    // the unique constraint.
    const created = await db.url.create({
      data: { longUrl, shortCode: crypto.randomUUID() },
    });

    // Step 2: turn that id into a Base62 short code and save it. The id is
    // guaranteed unique by Postgres, so the resulting code is collision-free.
    const shortCode = encodeBase62(created.id);
    await db.url.update({
      where: { id: created.id },
      data: { shortCode },
    });

    const shortUrl = `${req.nextUrl.origin}/${shortCode}`;

    return NextResponse.json({ shortCode, shortUrl, longUrl });
  } catch (err) {
    console.error("Failed to create short URL:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
