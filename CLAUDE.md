# Project: Distributed URL Shortener

## What this is
A URL shortener built to demonstrate real system-design concepts (not a toy CRUD app).
Built in layers — see BUILD_PLAN.md for what's done vs. pending.

## Stack (locked — do not change without asking)
- Frontend + API: Next.js 14 (App Router), TypeScript
- Database: PostgreSQL via Prisma ORM
- Cache: Redis via Upstash REST client (works serverless on Vercel; locally via redis + serverless-redis-http proxy, see docker-compose.full.yml)
- Rate limiting: atomic fixed-window counter via Redis INCR (10 req/10s per IP)
- Event streaming: Kafka (click events)
- Analytics store: ClickHouse (aggregated click stats, separate from Postgres)
- Horizontal scaling demo: 3 app containers behind Nginx — VERIFIED working
  locally via docker-compose.layer4.yml (a trimmed rebuild of what
  docker-compose.full.yml lost; see Layer 4 status below)
- Deployment target: Vercel (app) + Railway or Supabase (Postgres) + Upstash (Redis prod)

## Conventions
- API routes live in `app/api/*/route.ts`
- DB access only through `lib/db.ts` (Prisma client singleton)
- Short codes: Base62 alphabet, generated via collision-resistant ID strategy in `lib/shortcode.ts` — NOT random strings, NOT UUIDs truncated
- All submitted URLs go through `lib/validateUrl.ts` (scheme allowlist + SSRF protection) before being stored — never bypass this
- Redis access through `lib/redis.ts`; rate limiting logic in `lib/rateLimit.ts`
- Kafka producer in `lib/kafka.ts`; the consumer is a separate standalone process at `scripts/consumer.ts` (not an API route — needs a persistent connection)
- All env vars go in `.env.local`, document them in `.env.example`
- Keep functions small and commented simply — the person building this is learning full-stack as they go, so prefer clear over clever
- After implementing a feature, give a short plain-English summary of what was built and why, before moving to the next task

## Current layer status
- [x] Layer 1: MVP shorten + redirect (Next.js + Postgres) — working, deployed
- [x] Layer 2: Redis caching (cache-aside) — working, tested locally with Upstash
- [x] Layer 3: Rate limiting — atomic fixed-window counter via Redis INCR
      (10 req/10s per IP)
- [x] Layer 4: Horizontal scaling / Docker / Nginx — VERIFIED working.
      docker-compose.full.yml's app1/app2/app3/nginx services were silently
      removed in an earlier commit despite that commit's message. Rebuilt as
      a trimmed docker-compose.layer4.yml (postgres + app1/2/3 + nginx only,
      no Kafka/Zookeeper/ClickHouse/Redis) to fit local RAM constraints
      (~3.5GB, often much less free). Confirmed round-robin load balancing
      across all 3 app containers via nginx access logs ($upstream_addr
      logging added to nginx.conf for this proof). Image built once and
      shared across all 3 app services rather than rebuilt per-container.
- [x] Layer 5: Kafka + ClickHouse analytics pipeline — working, consumer
      running, ClickHouse table created, queried via /api/stats/[code]
- [ ] Layer 6: Observability + CI/CD + Kubernetes — basic CI added
      (.github/workflows/ci.yml: type-check, lint, build, dependency audit).
      Prometheus/Grafana/Kubernetes still not started, optional stretch
      beyond the 3-4 day deadline

## Known issues
- Dockerfile's `apk add openssl` fix is only in the runner stage, not
  builder — Prisma warns about missing libssl.so.1.1 during the build's
  static-generation pass. Not currently breaking the build.
- app/api/debug-redis/route.ts appears to get invoked during Next's
  build-time static analysis and fails on missing Redis credentials at
  build time. Harmless currently, but worth checking why a debug route is
  reachable during static analysis.
- Idempotency check in shorten endpoint (findFirst on longUrl) is app-level
  only, not DB-enforced — concurrent first-time requests for the same URL
  can still race past it and create duplicate rows. Stronger fix would be a
  DB unique constraint + catching P2002 conflicts.

## Commands
- `npm run dev` — start dev server
- `npx prisma migrate dev` — run DB migrations
- `npx prisma studio` — visual DB browser
