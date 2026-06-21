# BUILD_PLAN.md — 4 Day Sprint (Layers 1-5)

All the code for Layers 1-5 is already scaffolded in this repo. Your job each day
is: install deps, wire up env vars, run it, test it, fix whatever breaks (ask
Claude Code to debug), deploy, capture a number/screenshot for your interview story.

## Day 1 — Layer 1: Core MVP, deployed
1. `npm install`
2. `docker compose up -d` (starts Postgres only, from docker-compose.yml)
3. `cp .env.example .env.local` — fill in DATABASE_URL (already matches docker-compose)
4. `npx prisma migrate dev --name init`
5. `npm run dev` — test shortening + redirect at localhost:3000
6. Push to GitHub, deploy app to Vercel, Postgres to Railway/Supabase
7. Set DATABASE_URL on Vercel to your hosted Postgres, redeploy, confirm it works live

## Day 2 — Layer 2 + Layer 3: Redis cache + rate limiting
1. Sign up for Upstash Redis (free tier) — get REST URL + token
2. Add `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` to `.env.local` and Vercel
3. `npm run dev`, test: shorten a URL, visit it twice, ask Claude Code to help you log
   "cache hit" vs "cache miss" in the redirect route temporarily so you can see it working
4. Test rate limiting: hit `/api/shorten` more than 10 times fast, confirm you get a 429
5. Run a quick before/after latency test on the redirect route (e.g. `npx autocannon
   http://localhost:3000/<code>`) — save this number, it's your strongest interview line
6. Redeploy to Vercel with the Upstash env vars set

## Day 3 — Layer 4: Horizontal scaling + Nginx
1. `docker compose -f docker-compose.full.yml up --build` — this builds 3 app containers,
   Postgres, local Redis (+ REST proxy), and Nginx, all wired together
2. Once it's up, hit `http://localhost:8080` repeatedly (Nginx port) — requests are now
   load-balanced across app1/app2/app3
3. Run `npx prisma migrate deploy` against the Dockerized Postgres if tables aren't there yet
4. Ask Claude Code: "show me in the Nginx/Docker logs that requests are hitting different
   app instances" — take a screenshot, this is your scaling demo (doesn't need to be
   deployed publicly, a local demo + explanation is enough)

## Day 4 — Layer 5: Kafka + ClickHouse analytics pipeline
1. Same `docker-compose.full.yml` already includes Kafka, Zookeeper, and ClickHouse —
   if not already running: `docker compose -f docker-compose.full.yml up -d`
2. Create the ClickHouse table:
   `docker exec -i <clickhouse_container_name> clickhouse-client --multiquery < clickhouse-init.sql`
3. In a separate terminal, start the consumer: `npm run consumer`
   (leave this running — it's a long-lived process reading off Kafka)
4. Visit a short link a few times to generate click events
5. Check `/api/stats/<code>` — you should see hourly click counts coming from ClickHouse
6. If something doesn't connect, ask Claude Code to debug using the docker logs
   (`docker compose -f docker-compose.full.yml logs kafka` etc.)

## If you have any time left
Layer 6 (Kubernetes, Prometheus/Grafana, GitHub Actions CI/CD) is real depth but not
realistic to do well in this timeframe — treat it as a post-deadline add-on.

## What to walk into the interview with
- Live deployed link (Layers 1-3)
- Local demo / screenshots + clear explanation (Layers 4-5 — totally normal to not
  publicly deploy the Kafka/ClickHouse/multi-container setup; explaining the
  architecture and showing it running locally is enough)
- Your real measured cache latency numbers — use what you actually got, not the
  pitch's "10k req/sec sub-10ms" unless you've genuinely benchmarked it
