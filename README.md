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
   - `DEV_USER_ID` / `NEXT_PUBLIC_DEV_USER_ID` — for local dev (optional)

3. **Run**
   ```bash
   npm run dev
   ```

## E2E Tests

```bash
# Terminal 1: start the app
npm run dev

# Terminal 2: run tests (use port 3001 if dev server switched)
npm run test:e2e
# Or: PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e
```

## Deploy to Vercel

1. Connect your repo to Vercel
2. Add the same env vars in Project Settings → Environment Variables
3. Deploy

## Architecture

- **Redis** (Upstash) — single source of truth for all health data
- **Next.js App Router** — API routes + UI
- **AI** — operates only on Redis-retrieved data; never infers medical conclusions