# Legalbotassistend

Source-driven Telegram legal-news agent for Uzbekistan.

## Core rule

**Telegram channel = signal. Official website = factual source of truth.**

The agent does not feed copied Telegram post text into Gemini. A public Telegram source is used only to detect a new post and extract an allowlisted official link (for example `lex.uz`). The official page is fetched, normalized, stored, and then sent to Gemini for a concise Uzbek legal-news draft.

## Architecture

```text
Public Telegram source
        ↓
Signal + official URL extraction
        ↓
Official-source allowlist
        ↓
Official document fetch
        ↓
Neon Postgres
        ↓
Gemini draft
        ↓
Telegram admin review
   ✅ publish / ❌ reject
        ↓
Target Telegram channel
```

## Stack

- Next.js / TypeScript
- Vercel Functions
- Vercel Cron
- Neon Postgres
- Drizzle ORM
- Gemini API
- Telegram Bot API

## Environment variables

Copy `.env.example` to `.env.local` and set:

- `DATABASE_URL` — pooled Neon URL for application queries
- `DATABASE_URL_UNPOOLED` — direct Neon URL for schema changes
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ADMIN_CHAT_ID`
- `TELEGRAM_ADMIN_USER_ID`
- `TELEGRAM_TARGET_CHANNEL_ID`
- `CRON_SECRET`
- `ADMIN_SECRET`
- `APP_BASE_URL`

Never commit secret values.

## Database

Schema source of truth: `lib/db/schema.ts`.

Initial reviewed migration: `drizzle/0000_foundation.sql`.

The app uses the pooled Neon connection for runtime traffic. Use the direct/unpooled connection for migrations.

## Endpoints

- `GET /api/health` — DB health
- `GET /api/cron/monitor` — Vercel Cron, protected by `CRON_SECRET`
- `POST /api/admin/monitor` — manual monitor run, protected by `ADMIN_SECRET`
- `POST /api/telegram/webhook` — Telegram callbacks, protected by webhook secret

## Source policy

The initial source is `@huquqiyaxborot_lotin`.

Only links from an explicit official-domain allowlist are eligible for AI processing. Posts with no official link are skipped.

## Safety / publishing policy

Version 1 is **human-in-the-loop**. Gemini never publishes directly. Every generated draft is sent to the configured admin Telegram chat with Publish and Reject buttons.

## Vercel Cron

The repository defaults to a daily schedule so it is deployable on Vercel Hobby. If the deployment is on a plan that supports higher-frequency cron, change `vercel.json` after confirming the plan.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm run dev
```
