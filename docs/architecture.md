# Zyphnaro — Architecture

Zyphnaro is a personal career intelligence system, not a job board. It is built around one
pipeline that turns raw listings from many sources into scored, explained, trustworthy
opportunities:

```
SOURCE APIs
   ↓
SOURCE ADAPTERS        (per-source auth + fetch, see src/lib/services/sources)
   ↓
NORMALIZATION          (raw response -> Opportunity model, see src/lib/types/opportunity.ts)
   ↓
DUPLICATE DETECTION    (not yet implemented — see "Future work" below)
   ↓
OPPORTUNITY DATABASE   (Supabase `opportunities` table — mocked today in src/lib/mock)
   ↓
AI ANALYSIS            (src/lib/services/ai — OpportunityAIResult)
   ↓
MATCH ENGINE           (src/lib/engines/match-engine.ts)
   ↓
TRUST ENGINE           (src/lib/engines/trust-engine.ts)
   ↓
FRESHNESS ENGINE       (derived client-side today from postedAt/detectedAt)
   ↓
NOTIFICATION ENGINE    (src/lib/repositories/notification-repository.ts)
   ↓
ZYPHNARO DASHBOARD     (src/app/(app)/dashboard)
```

## Layered structure

```
src/
  app/                      Next.js App Router pages and API routes
    (app)/                  Route group sharing the AppShell (sidebar + top bar)
    api/                    Route handlers — mock responses today, real logic later
  components/
    ui/                     Hand-built shadcn-style primitives (Button, Card, Badge, ...)
    layout/                 Sidebar, mobile header/drawer, bottom nav, AppShell
    shared/                 MatchScore, TrustScore, CVScore, SkillBadge, MetricCard, ...
    opportunities/          OpportunityCard, ActNowCard, OpportunityFilters
    applications/           ApplicationCard, ApplicationKanban
    interview/               Interview room components
    recruiter/              RecruiterCard, MessageGenerator
    sources/, notifications/, profile/, pricing/
  lib/
    types/                  The normalized domain model — the contract every layer depends on
    mock/                   Centralized mock data (never imported directly by components)
    repositories/           Repository interfaces + Mock implementations
    services/ai/            AIService interface + MockAIService
    services/sources/       JobSource interface + mock adapters (Reddit, Upwork, ...)
    engines/                Pure, explainable match + trust scoring functions
    hooks/                  TanStack Query hooks that call repositories
```

## Why the repository pattern

Every page and component talks to a **repository interface** (`OpportunityRepository`,
`ApplicationRepository`, `UserRepository`, `NotificationRepository`, `SourceRepository`),
never to mock arrays directly. Today those interfaces are implemented by in-memory
`Mock*Repository` classes. Swapping to Supabase means writing a `Supabase*Repository`
class that implements the same interface and changing one export — no component changes.

## Why the AI service interface

All AI-powered features (opportunity analysis, CV analysis, CV tailoring, recruiter
messages, interview questions, interview evaluation) go through the single `AIService`
interface in `src/lib/types/ai.ts`. The UI only ever calls `aiService` from
`src/lib/services/ai/index.ts`. Today that's `MockAIService`; in production it should be
a class that calls a server-side `/api/ai/*` route, which in turn calls a real provider
and validates the JSON response with Zod before returning it.

## Source adapter pattern

Every job source implements the `JobSource` interface (`src/lib/services/sources/job-source.ts`):
`authenticate()`, `fetchOpportunities()`, `normalizeOpportunity()`. This keeps the rest of
the pipeline source-agnostic — adding a new source means writing one adapter, not touching
match/trust/UI code. See `/docs/source-integrations.md` for per-source details.

## Future work not yet implemented in this prototype

- **Duplicate detection**: the same role posted to multiple sources should be merged.
- **Background jobs**: the pipeline above should run server-side on a schedule, not in
  the browser. See "Background processing" in `/docs/backend-integration.md`.
- **Realtime**: new opportunities and notifications should stream in via Supabase
  Realtime instead of query refetching.
