# URL Shortener

A distributed URL shortener built from scratch to demonstrate real system-design
concepts: Base62 short-code generation, Redis caching, rate limiting, and (eventually)
horizontal scaling and an event-driven analytics pipeline.

See `CLAUDE.md` for project conventions (used by Claude Code) and `BUILD_PLAN.md` for
the step-by-step build sequence.

## Quick start
```bash
npm install
docker compose up -d          # starts local Postgres
cp .env.example .env.local
npx prisma migrate dev --name init
npm run dev
```
Visit http://localhost:3000
