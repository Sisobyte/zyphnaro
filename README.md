# Zyphnaro — AI Career Intelligence Platform

> Don't just find opportunities. Know which ones are worth pursuing.

Zyphnaro is a personal career intelligence system, not a traditional job board. It
discovers opportunities from multiple sources, analyzes them, scores how well they fit
your skills and goals, flags trust/safety concerns, checks your CV against individual
opportunities, helps you tailor application materials, prepares you for interviews, and
tracks outcomes — end to end:

```
DISCOVER → VERIFY → MATCH → OPTIMIZE → CONNECT → PREPARE → APPLY → TRACK → LEARN
```

This repository is a **production-quality frontend prototype**. Authentication, core
data, file storage, AI, and one real ingestion layer are now implemented (Supabase +
Gemini + Adzuna/Greenhouse/Lever), wired to run in either mode automatically:

- **No env vars set** → fully mock mode, works completely offline, no setup needed.
- **Supabase env vars set** → real accounts, sessions, route protection, real
  opportunities/saved items/applications/notifications/source connections, and real
  CV (PDF, embedded preview) + avatar uploads.
- **`GEMINI_API_KEY` also set** → all six AI modules call real Gemini, including
  reading real uploaded CVs natively and suggesting a role/skills during onboarding
  from the CV's actual content.
- **`ADZUNA_APP_ID`/`ADZUNA_APP_KEY` also set** → `npm run sync:sources` pulls real,
  broad, cross-field listings (not tech-filtered) from Adzuna, plus Greenhouse/Lever
  company boards (no key needed for those two) — and once deployed to Vercel with
  `CRON_SECRET` set, this runs automatically once a day via `vercel.json`'s cron
  config, no manual trigger needed.

**Built to be profession-agnostic, not developer-only:** onboarding asks "what kind of
work are you looking for?" as open text, not a fixed role dropdown, and ingestion is
deliberately unfiltered by field — a digital marketer, a data analyst, and a frontend
developer all get an equally native experience. See `/docs/source-integrations.md`
for the design principle behind this.

- **Realtime** → new opportunities show a live "N new opportunities" banner on the
  Opportunities page, and strong-match notifications (a genuinely new capability —
  the sync job now checks every new listing against every user's real profile and
  creates real notification rows) push live to the bell icon, no refresh needed.

See the "Phase 1–7" quickstarts in `/docs/backend-integration.md`,
`/docs/ai-integration.md`, and `/docs/source-integrations.md`.

Real payments behind the Pricing page's "Upgrade" buttons is the one remaining piece —
see "Phase 8" in `/docs/backend-integration.md`'s rollout plan.

## Product principles

- AI powers the product quietly. Instead of "Ask AI anything", Zyphnaro surfaces
  concrete, explainable questions: *"94% Match → Why?"*, *"CV 78/100 → What should I
  fix?"*, *"Trust 93/100 → Why?"*, *"Interview readiness 81% → Practice weak areas."*
- Zyphnaro never invents experience, skills, or qualifications you haven't provided —
  CV tailoring only restructures and re-emphasizes what's already true.
- Trust analysis never definitively labels a listing a scam — only "low concern",
  "potential concern", or "high risk" based on explainable signals.
- Role Explorer supports any profession — the mock user is a frontend developer, but
  nothing in the data model assumes that.

## Technology stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Hand-built shadcn-style UI primitives (Button, Card, Badge, Tabs, Progress, ...)
- Lucide icons
- React Hook Form + Zod (see the inline profile-editing form)
- TanStack Query (all data access goes through query/mutation hooks)
- Recharts (Analytics page)
- Supabase-ready repository architecture (see below)

## Local setup

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to `/dashboard`. No environment variables are
required in mock mode.

```bash
npm run build   # production build
npm run lint    # eslint
```

## Mock mode

Every backend/AI integration point is clearly marked in code:

```ts
// BACKEND INTEGRATION:
// Replace this mock service with the Supabase/API implementation.
// See /docs/backend-integration.md
```

```ts
// AI INTEGRATION:
// Replace mock response with the configured AI provider.
// Never expose AI API keys in client-side code.
// See /docs/ai-integration.md
```

Mock data lives only in `src/lib/mock/` and is never imported directly by a page or
component — everything goes through a repository interface in `src/lib/repositories/`,
so swapping mock data for a real database is a one-line change per repository.

## Architecture

See `/docs/architecture.md` for the full pipeline (source adapters → normalization →
match engine → trust engine → notifications) and folder-by-folder breakdown.

## Backend integration

See `/docs/backend-integration.md` for the step-by-step Supabase migration path, and
`/docs/database-schema.md` for the full table definitions.

## AI integration

See `/docs/ai-integration.md` for the 10 AI modules, their request/response shapes, and
how to implement a real provider behind the existing `AIService` interface.

## Source integrations

See `/docs/source-integrations.md` for per-source auth, rate limits, and which sources
(LinkedIn, Indeed, Wellfound, and others) require partnership approval before real
integration.

## Security

- No API keys in client code or `NEXT_PUBLIC_` variables — see `.env.example`.
- All AI calls are designed to happen server-side, in `/api/ai/*` route handlers.
- Every user-scoped table in `/docs/database-schema.md` is designed for Row Level
  Security so users can only access their own CVs, applications, and profile data.
- External opportunity content should be sanitized before rendering; AI output should
  be validated with Zod before being trusted.

## Roadmap (not yet implemented in this prototype)

- Real source adapters (currently mock adapters return the local mock dataset)
- Real AI provider behind `AIService`
- Supabase Auth, database, Storage and Realtime
- Duplicate opportunity detection across sources
- Stripe/Paystack/Flutterwave billing behind the Pricing page

## Project structure

```
src/
  app/(app)/        Pages, sharing a sidebar + top bar layout
  app/api/          API route stubs (mock responses today)
  components/       ui/, layout/, and feature-specific components
  lib/
    types/          Normalized domain model
    mock/           Centralized mock data
    repositories/   Repository interfaces + Mock implementations
    services/ai/    AIService interface + MockAIService
    services/sources/ JobSource interface + mock adapters
    engines/        Match engine + trust engine
    hooks/          TanStack Query hooks
docs/               Architecture, backend, AI, source, schema and deployment docs
supabase/migrations/ SQL migrations to run in the Supabase SQL editor
src/proxy.ts        Session refresh + route protection (Next.js 16's proxy convention)
```
