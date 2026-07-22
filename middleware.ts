import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { instanceId } from "@/lib/instanceId";

// Tags every response with which instance served it — the signal the
// /system-health page polls for to show request rotation across
// app1/app2/app3 (Docker) or a single instance (Vercel/local dev).
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("X-Served-By", instanceId);
  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
