// Integration check: shortening the same longUrl twice should return the
// same shortCode instead of creating a duplicate row.
// Requires the dev server running against a real DB: `npm run dev`
//
// Run with: npm run test:idempotency

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const testUrl = `https://example.com/idempotency-test-${Date.now()}`;

async function shorten(longUrl: string) {
  const res = await fetch(`${BASE_URL}/api/shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ longUrl }),
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<{ shortCode: string }>;
}

async function main() {
  const first = await shorten(testUrl);
  const second = await shorten(testUrl);

  if (first.shortCode !== second.shortCode) {
    console.error(
      `FAIL: expected the same shortCode, got "${first.shortCode}" then "${second.shortCode}"`
    );
    process.exit(1);
  }

  console.log(`PASS: shortening the same longUrl twice returned "${first.shortCode}" both times`);
}

main().catch((err) => {
  console.error("Test errored:", err);
  process.exit(1);
});
