// Validates that a submitted URL is safe to store and redirect to.
// Two real attack classes this stops for a URL shortener specifically:
//
// 1. Non-http(s) schemes (javascript:, data:, file:) — these can execute code
//    or leak local files if ever rendered/followed in a browser context.
//
// 2. SSRF (Server-Side Request Forgery) — without this, someone could submit
//    a URL pointing at localhost, 127.0.0.1, 169.254.169.254 (cloud metadata
//    endpoint — a classic SSRF target), or private IP ranges (10.x, 192.168.x,
//    172.16-31.x). Since this app just stores+redirects rather than fetching
//    the URL server-side, the practical risk here is lower than in apps that
//    *fetch* the target URL — but blocking it is still correct practice and
//    becomes critical if you ever add server-side link previews/scraping.

const ALLOWED_SCHEMES = ["http:", "https:"];

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./, // link-local, includes cloud metadata endpoint
  /^::1$/,
  /^\[::1\]$/,
];

export function validateUrl(input: string): { valid: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { valid: false, reason: "Not a valid URL" };
  }

  if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
    return { valid: false, reason: "Only http and https URLs are allowed" };
  }

  if (PRIVATE_HOSTNAME_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    return { valid: false, reason: "URLs pointing to internal/private addresses are not allowed" };
  }

  if (input.length > 2048) {
    return { valid: false, reason: "URL is too long" };
  }

  return { valid: true };
}
