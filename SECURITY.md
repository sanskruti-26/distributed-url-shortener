# Security notes

## Covered in this project (portfolio/interview-ready level)
- Input validation: only http/https schemes accepted, rejects javascript:/data:/file: URIs
- SSRF protection: rejects URLs pointing at localhost, private IP ranges, and the
  cloud metadata endpoint (169.254.169.254)
- Rate limiting: atomic fixed-window counter (Redis INCR) per IP on the shorten endpoint, prevents basic abuse/spam
- SQL injection: not applicable — Prisma uses parameterized queries throughout
- XSS: user-submitted URLs are only ever used as `href` values (never rendered as HTML),
  so there's no script-injection surface in the current UI
- Secrets: `.env.local` is gitignored, never committed; `.env.example` documents
  required vars without real values
- Security headers: clickjacking protection, MIME-sniffing protection, referrer policy
  (see `next.config.js`)

## NOT covered — required before this could actually be "sell-ready"
This list matters: a portfolio project being secure-for-a-demo is a different bar
than a product handling real users' data and money.

- **No authentication** — anyone can create/view links, no concept of an account
  or ownership of a link
- **No authorization/multi-tenancy** — no per-user data isolation
- **No abuse/content moderation** — nothing stops someone shortening a phishing
  or malware-distribution URL; real link shorteners (bit.ly etc.) run submitted
  URLs against threat-intel blocklists (e.g. Google Safe Browsing API)
- **No HTTPS enforcement at the app level** — relies entirely on the hosting
  platform (Vercel) terminating TLS; fine for Vercel, would need explicit handling
  on self-hosted infra
- **No audit logging** — no record of who created what, for abuse investigation
- **No backups/disaster recovery plan** for the database
- **No legal/compliance layer** — Terms of Service, Acceptable Use Policy,
  privacy policy, GDPR/data-retention handling — all required before charging
  real users or handling their data
- **No dependency/vulnerability scanning** in CI (e.g. `npm audit`, Dependabot,
  Snyk) — should run on every PR for anything in production
- **No secrets manager** — env vars are fine for a portfolio project; production
  SaaS typically uses a managed secrets store (Vercel encrypted env vars are a
  reasonable middle ground, already in use here)

Treat the "covered" list as: this project demonstrates security-conscious thinking,
which is what an interviewer is checking for. Treat the "not covered" list as the
honest answer if someone asks "could you sell this today" — the answer is no, and
being able to explain *why* and *what's missing* is itself a strong interview answer.
