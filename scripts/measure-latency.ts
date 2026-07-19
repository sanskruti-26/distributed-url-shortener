// Measures redirect-route latency for cold (Postgres) vs warm (Redis) cache
// paths against real infra (whatever DATABASE_URL / UPSTASH_REDIS_REST_URL
// point at in .env.local). Run with: npx tsx scripts/measure-latency.ts
// Requires the dev server running: npm run dev

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const SAMPLE_SIZE = 50;
const CREATE_DELAY_MS = 1100; // stays under the 10 req/10s rate limit on /api/shorten

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(idx, 0), sorted.length - 1)];
}

function stats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return {
    n: samples.length,
    min: sorted[0],
    p50: percentile(sorted, 50),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1],
    avg,
  };
}

function fmt(s: ReturnType<typeof stats>) {
  return `n=${s.n} min=${s.min.toFixed(1)}ms p50=${s.p50.toFixed(1)}ms p99=${s.p99.toFixed(1)}ms avg=${s.avg.toFixed(1)}ms max=${s.max.toFixed(1)}ms`;
}

async function createShortUrl(longUrl: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ longUrl }),
  });
  if (!res.ok) {
    throw new Error(`shorten failed: ${res.status} ${await res.text()}`);
  }
  const { shortCode } = (await res.json()) as { shortCode: string };
  return shortCode;
}

async function timeRedirect(shortCode: string): Promise<number> {
  const start = performance.now();
  await fetch(`${BASE_URL}/${shortCode}`, { redirect: "manual" });
  return performance.now() - start;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("Priming Next.js route compilation (discarded)...");
  await timeRedirect("__priming__");

  console.log(`Creating ${SAMPLE_SIZE} fresh short URLs (paced ${CREATE_DELAY_MS}ms apart for the rate limiter)...`);
  const codes: string[] = [];
  for (let i = 0; i < SAMPLE_SIZE; i++) {
    const code = await createShortUrl(`https://example.com/latency-test-${Date.now()}-${i}`);
    codes.push(code);
    await sleep(CREATE_DELAY_MS);
  }

  console.log(`Measuring COLD latency (first hit per code, Postgres path) — n=${SAMPLE_SIZE}...`);
  const cold: number[] = [];
  for (const code of codes) {
    cold.push(await timeRedirect(code));
  }

  console.log(`Measuring WARM latency (second hit per code, Redis cache path) — n=${SAMPLE_SIZE}...`);
  const warm: number[] = [];
  for (const code of codes) {
    warm.push(await timeRedirect(code));
  }

  const coldStats = stats(cold);
  const warmStats = stats(warm);

  console.log("\n=== Results ===");
  console.log("Cold (Postgres): " + fmt(coldStats));
  console.log("Warm (Redis):    " + fmt(warmStats));
  console.log(`Speedup at p50: ${(coldStats.p50 / warmStats.p50).toFixed(2)}x`);
  console.log(`Speedup at p99: ${(coldStats.p99 / warmStats.p99).toFixed(2)}x`);
  console.log(`Speedup at avg: ${(coldStats.avg / warmStats.avg).toFixed(2)}x`);

  console.log("\n=== Raw samples (ms) ===");
  console.log("cold:", cold.map((n) => Number(n.toFixed(1))));
  console.log("warm:", warm.map((n) => Number(n.toFixed(1))));
}

main().catch((err) => {
  console.error("Measurement errored:", err);
  process.exit(1);
});
