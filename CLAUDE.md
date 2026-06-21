# Project: Distributed URL Shortener

## What this is
A URL shortener built to demonstrate real system-design concepts (not a toy CRUD app).
Built in layers — see BUILD_PLAN.md for what's done vs. pending.

## Stack (locked — do not change without asking)
- Frontend + API: Next.js 14 (App Router), TypeScript
- Database: PostgreSQL via Prisma ORM
- Cache: Redis via Upstash REST client (works serverless on Vercel; locally via redis + serverless-redis-http proxy, see docker-compose.full.yml)
- Rate limiting: token bucket, stored in Redis
- Event streaming: Kafka (click events)
- Analytics store: ClickHouse (aggregated click stats, separate from Postgres)
- Horizontal scaling demo: 3 app containers behind Nginx (docker-compose.full.yml)
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
- [x] Layer 1: MVP shorten + redirect (Next.js + Postgres)
- [x] Layer 2: Redis caching (cache-aside) — scaffolded, needs local Upstash/Docker test
- [x] Layer 3: Rate limiting (token bucket via Redis) — scaffolded, needs testing
- [x] Layer 4: Horizontal scaling / Docker / Nginx — scaffolded in docker-compose.full.yml + nginx.conf
- [x] Layer 5: Kafka + ClickHouse analytics pipeline — scaffolded, needs consumer running + ClickHouse table created
- [ ] Layer 6: Observability + CI/CD + Kubernetes — basic CI added (.github/workflows/ci.yml: type-check, lint, build, dependency audit). Prometheus/Grafana/Kubernetes still not started, optional stretch beyond the 3-4 day deadline

## Commands
- `npm run dev` — start dev server
- `npx prisma migrate dev` — run DB migrations
- `npx prisma studio` — visual DB browser
