# Migration order

Run these in the Supabase SQL Editor **in this exact order** — each one may depend on
tables or columns created by the ones before it. Every file is idempotent-ish where
reasonably possible (`if not exists`, `on conflict do nothing`), but they are still
meant to be run once each, in order, not repeatedly.

| # | File | What it creates | Depends on |
|---|---|---|---|
| 1 | `0001_profiles.sql` | `profiles` table, RLS, the trigger that auto-creates a profile row on signup | Supabase Auth (`auth.users`) — no prior migration needed |
| 2 | `0002_opportunities_and_applications.sql` | `opportunities` (shared), `saved_opportunities`, `applications`, `notifications`, `source_connections` — all private-per-user except `opportunities` | `profiles` (1) |
| 3 | `0003_storage.sql` | `cv-documents` (private) and `avatars` (public-read) Storage buckets + policies, adds `cv_storage_path` to `profiles` | `profiles` (1) |
| 4 | `0004_realtime_opportunities.sql` | Enables Supabase Realtime on `opportunities` (Realtime on `notifications` was already enabled in migration 2) | `opportunities` (2) |
| 5 | `0005_profile_extras.sql` | Adds `min_match_score`, `experience`, `projects`, `education` columns to `profiles` — these previously had no real column at all (Settings' "min match score" control and CV-extracted experience/projects/education) | `profiles` (1) |

## After running all four

- [ ] `npm run seed:opportunities` — populates `opportunities` with the mock dataset so
      the app isn't empty on day one (see `/docs/backend-integration.md`, Phase 2)
- [ ] Add your Adzuna key and run `npm run sync:sources` — or just deploy to Vercel
      with `CRON_SECRET` set and let the daily cron handle it (Phase 5–6)

## Where each phase's setup is documented in full

| Phase | What | Doc |
|---|---|---|
| 1 | Auth | `/docs/backend-integration.md` → "Phase 1 quickstart" |
| 2 | Core data (opportunities, applications, notifications, sources) | `/docs/backend-integration.md` → "Phase 2 quickstart" |
| 3 | File storage (CV, avatar) | `/docs/backend-integration.md` → "Phase 3 quickstart" |
| 4 | AI (Gemini) | `/docs/ai-integration.md` |
| 5 | Real source ingestion (Adzuna, Greenhouse, Lever) | `/docs/backend-integration.md` → "Phase 5 quickstart", `/docs/source-integrations.md` |
| 6 | Scheduled sync (Vercel Cron) | `/docs/backend-integration.md` → "Phase 6 quickstart" |
| 7 | Realtime (live opportunities + live match notifications) | `/docs/backend-integration.md` → "Phase 7 quickstart" |
