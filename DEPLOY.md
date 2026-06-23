# Deploying SEOMaster (Docker on a VPS)

This is the recommended deployment: a single VPS running the app, Postgres, Redis,
and a Caddy reverse proxy (automatic HTTPS) — all via Docker Compose. The app runs
the BullMQ worker in-process, so background crawls, the daily rank sweep, and the
weekly report scheduler all work without extra setup.

## Prerequisites

- A VPS (1–2 GB RAM is enough to start) with Docker + Docker Compose plugin.
- A domain pointed at the VPS (an `A` record) if you want HTTPS.

## 1. Get the code + configure

```bash
git clone git@github-es:ebnsina/seo-master.git
cd seo-master
cp .env.example .env
```

Edit `.env`:

- **`APP_ENCRYPTION_KEY`** (required) — `openssl rand -base64 32`
- **`DOMAIN`** + **`ACME_EMAIL`** — your domain and email for Let's Encrypt.
  For a quick local/no-TLS test, set `DOMAIN=:80`.
- **`APP_URL`** — e.g. `https://app.example.com` (used for OAuth callback + email links).
- **`POSTGRES_PASSWORD`** — a strong password.
- Optional: `GOOGLE_*`, `PAGESPEED_API_KEY`, `DATAFORSEO_*`, `AI_*`, `SMTP_*` + `MAIL_FROM`.

> `DATABASE_URL` and `REDIS_URL` are set automatically by Compose to the bundled
> `db`/`redis` services — leave them blank.

## 2. Build and start

```bash
docker compose up -d --build
```

What happens: Postgres + Redis start → the one-off **`migrate`** service applies
Drizzle migrations → the **`app`** server starts → **Caddy** serves it over HTTPS.

Check status / logs:

```bash
docker compose ps
docker compose logs -f app
```

Visit `https://<your-domain>`.

## 3. Updating to a new version

```bash
git pull
docker compose up -d --build      # re-runs migrations, then restarts the app
```

## Operations

- **Run migrations manually:** `docker compose run --rm migrate`
- **Restart just the app:** `docker compose restart app`
- **Backup the database:**
  `docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql`
- **Tail worker/cron activity:** `docker compose logs -f app` (crawls, rank sweep,
  weekly reports all log here).

## Notes & scaling

- **Background jobs** run inside the app container (Redis-backed). This is correct
  for a single app instance. If you scale to **multiple** app replicas behind a load
  balancer, split the worker into its own service so exactly one worker runs — the
  queue code (`src/lib/server/queue/`) is already structured for that.
- **Email & integrations are optional** and degrade gracefully: no `SMTP_*` → weekly
  reports are disabled; no `GOOGLE_*` → guided manual submission; no `AI_*` → manual
  fixes/briefs. Nothing crashes when a provider is absent.
- **Long crawls** have no serverless timeout here — they run to completion in the
  worker.
