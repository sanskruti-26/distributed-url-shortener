import { NextResponse } from "next/server";
import { instanceId } from "@/lib/instanceId";

// Lightweight endpoint for the /system-health page to poll — no DB/Redis
// calls, so it stays fast regardless of Postgres/Upstash latency.
export async function GET() {
  return NextResponse.json({
    servedBy: instanceId,
    timestamp: new Date().toISOString(),
  });
}
