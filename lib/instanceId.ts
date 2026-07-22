// Identifies which running instance served a request — used by middleware
// (X-Served-By header) and /api/ping so app1/app2/app3 in the Layer 4 Docker
// setup show up as distinct instances.
//
// Vercel is serverless with no fixed containers, and doesn't document setting
// HOSTNAME at all — it could be unset (fine) or an internal sandbox value that
// changes per invocation (would falsely look like multiple rotating
// containers). VERCEL is reliably set by Vercel, so it takes priority.
export const instanceId = process.env.VERCEL
  ? "single-instance"
  : process.env.HOSTNAME || "single-instance";
