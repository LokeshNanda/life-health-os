# Health Memory AI

A personal, lifelong health memory assistant built with Next.js and Redis.

Users can upload medical documents, images, voice notes, or text to build a private health knowledge base.  
AI helps summarize, organize, and answer questions strictly from user-provided data.

⚠️ **This app is for information organization only. It does NOT provide medical advice.**

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with:
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — from [Upstash](https://upstash.com)
   - `OPENAI_API_KEY` — from [OpenAI](https://platform.openai.com)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — from [Clerk Dashboard](https://dashboard.clerk.com/last-active?path=api-keys) (Clerk supports [keyless mode](https://clerk.com/docs/nextjs/getting-started/quickstart#keyless-mode-zero-config-setup) for instant development without keys)
   - `DEV_USER_ID` / `NEXT_PUBLIC_DEV_USER_ID` — for local dev (optional)

3. **Run**
   ```bash
   npm run dev
   ```

## E2E Tests

```bash
# Terminal 1: start the app (use dev:e2e to bypass auth for tests)
npm run dev:e2e

# Terminal 2: run tests (use port 3001 if dev server switched)
npm run test:e2e
# Or: PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e
```

E2E tests use `E2E_BYPASS_AUTH=true` to skip sign-in. Ensure `NEXT_PUBLIC_DEV_USER_ID` is set in `.env` so API calls use the dev user.

## Docker

Build and run the app in a container (env vars must be provided at runtime).

**Using Docker Compose (recommended):**

```bash
# Ensure .env exists (copy from .env.example and fill in values)
docker compose up --build
# Detached: docker compose up -d --build
```

**Using plain Docker:**

```bash
# Build image
docker build -t health-memory-ai .

# Run (pass env via file or -e flags)
docker run -p 3000:3000 --env-file .env health-memory-ai
# Or with explicit vars:
docker run -p 3000:3000 \
  -e UPSTASH_REDIS_REST_URL="$UPSTASH_REDIS_REST_URL" \
  -e UPSTASH_REDIS_REST_TOKEN="$UPSTASH_REDIS_REST_TOKEN" \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
  -e CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
  health-memory-ai
```

The app uses `output: "standalone"` in `next.config.ts` for a minimal production image.

## Deploy to Vercel

1. Connect your repo to [Vercel](https://vercel.com); the project uses `vercel.json` and is detected as Next.js.
2. Add the same env vars in **Project Settings → Environment Variables** (see `.env.example`). To limit OpenAI cost, set `ALLOWED_OPENAI_USER_IDS` to a comma-separated list of Clerk user IDs; leave empty to allow no one.
3. Deploy (push to main or use the Vercel dashboard).

## Architecture

- **Redis** (Upstash) — single source of truth for all health data
- **Next.js App Router** — API routes + UI
- **AI** — operates only on Redis-retrieved data; never infers medical conclusions