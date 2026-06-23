import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET() {
  await redis.set("test-key", "hello");
  const value = await redis.get("test-key");

  return NextResponse.json({ value });
}