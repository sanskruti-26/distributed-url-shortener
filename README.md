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

## Resilience test: container failure under load
- Test: autocannon load test, 10 connections, 30s duration, against
  http://localhost:8080/, with app2 killed mid-flight (docker kill)
- Result: 2,082 requests in 30.52s, 2,077 returned 200 (99.76%), 0 server
  errors (502/503/504), 5 returned 499 (client-closed)
- Latency: median 83ms, but max spiked to 5170ms — the visible cost of
  failover for in-flight requests that were mid-connection to app2 when it
  died. Even the failed-over requests eventually succeeded; the cost showed
  up as latency, not errors.
- The 5 x 499s occurred ~14s after the kill, caused by nginx's default
  health-check window (max_fails=1, fail_timeout=10s): nginx retried the
  still-dead backend at the 10s mark and the client's own timeout hit first.
  A real nginx behavior, not a test bug.
- Proof — nginx access log showing live in-request failover, client saw 200:
  ```
  172.18.0.1 - [19/Jul/2026:15:49:24 +0000] "GET / HTTP/1.1" 200 upstream=172.18.0.4:3000, 172.18.0.5:3000
  ```
  (172.18.0.4 was the killed app2 container; nginx retried on a live backend
  within the same request)

See `autocannon-chaos-test.log` for the full raw output.
