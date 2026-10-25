# Deployment Guide

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values once real integrations are wired up
npm run dev
```

The app works fully offline in mock mode — you do not need any environment variables
filled in to run it locally, since every backend/AI integration point uses a mock
service by default.

## Production build

```bash
npm run build
npm run start
```

## Recommended hosting

- **Frontend**: Vercel (first-party Next.js support, including the App Router and
  route handlers used in `src/app/api`).
- **Database/Auth/Storage**: Supabase (see `/docs/backend-integration.md`).
- **Background jobs**: Supabase Edge Functions on a cron schedule, or a small
  worker service (e.g. a queue consumer) for the opportunity ingestion pipeline —
  this should not run inside a Next.js request handler.

## Environment variables

Set every variable from `.env.example` in your hosting provider's dashboard once real
integrations are enabled. Keep `SUPABASE_SERVICE_ROLE_KEY`, all AI provider keys, and
all source client secrets **server-side only** — never prefix them with `NEXT_PUBLIC_`.

## Rollout order

This prototype is designed so each integration point can go live independently:

1. **Auth**: swap `MockUserRepository` for a Supabase-backed one, gate `(app)` behind
   a session.
2. **Data**: swap the remaining mock repositories for Supabase-backed ones.
3. **One real source**: implement one real `JobSource` adapter (Greenhouse or Lever
   are the simplest, since they need no OAuth) and run it via a scheduled job.
4. **AI**: implement one real `AIService` (e.g. `AnthropicAIService`) behind the
   `/api/ai/*` routes.
5. **Payments**: only once the above are stable, integrate a real payment provider
   behind the Pricing page's "Upgrade" buttons.

## Health checks

Before enabling a new integration in production, confirm:

- [ ] The repository/service still satisfies its TypeScript interface (`tsc` passes).
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] RLS policies exist for every new table touched (see `/docs/database-schema.md`).
- [ ] No secret key appears in a `NEXT_PUBLIC_` variable or client bundle.
