# Backend Integration Guide

This prototype runs entirely on mock data and in-memory repositories. This document
explains, step by step, how to replace them with a real Supabase backend without
rebuilding the frontend.

## Status: what's real today vs. still mock

As of this revision, **authentication, core data, file storage, AI, real ingestion,
scheduled sync, and Realtime are all implemented** (Phases 1–7): everything from Phase
6, plus live opportunity/notification updates without a manual refresh, and real
match-based notifications (a piece that didn't exist before this phase — see the
Phase 7 quickstart below). **Reddit, Upwork, Freelancer, LinkedIn, Indeed, and
Wellfound remain mock** — see `/docs/source-integrations.md` for why each one
currently can't be self-served.

The app is designed to run in either mode automatically:

- **No `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` set** → the app runs
  fully in mock mode: `/login` and `/signup` simulate a session with `sessionStorage`,
  `src/proxy.ts` skips all route protection, and every repository uses its in-memory
  `Mock*` implementation.
- **Both env vars set** → real Supabase Auth and data take over automatically:
  `/login` and `/signup` call `supabase.auth.signInWithPassword` / `signUp`,
  `src/proxy.ts` redirects unauthenticated visitors to `/login`, and every repository
  uses its `Supabase*` implementation. No code changes needed to flip this — just add
  the env vars (and run the Phase 2 seed script once, for opportunities).

## Phase 1 quickstart (auth — already wired in code)

1. Create a project at https://supabase.com.
2. In the Supabase SQL editor, run `supabase/migrations/0001_profiles.sql` from this
   repo. It creates the `profiles` table, Row Level Security policies, and a trigger
   that auto-creates a profile row whenever someone signs up.
3. Copy your project's URL and anon key into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. **Required — add a redirect URL allowlist entry.** In your Supabase project,
   go to Authentication → URL Configuration → Redirect URLs, and add:
   ```
   http://localhost:3000/auth/callback
   ```
   (and your production URL + `/auth/callback` once you deploy, e.g.
   `https://your-app.vercel.app/auth/callback`). Without this, Supabase will refuse
   to redirect back to your app after email confirmation. This route
   (`src/app/auth/callback/route.ts`) is what exchanges the confirmation link's
   one-time code for a real session and sends the person to `/onboarding` —
   skipping this setup step is the most common reason someone ends up "logged in
   somehow" but never sees onboarding.
5. Restart `npm run dev`. `/login` and `/signup` now hit real Supabase Auth, and
   `src/proxy.ts` will redirect any unauthenticated visitor away from every route
   except `/`, `/login`, and `/signup`.
6. By default, Supabase requires email confirmation before a session exists — the
   signup page already handles this (shows a "check your email" screen). You can turn
   confirmation off in Supabase Auth settings for faster local testing with friends —
   if you do, `data.session` exists immediately on signup and the callback route above
   is simply never used, which is fine.
7. Test the full loop: sign up → confirm email (if enabled) → land on `/onboarding` →
   finish setup → land on `/dashboard` → use the avatar menu to log out → confirm you're
   redirected to `/login` and can't get back into `/dashboard` by typing the URL.

**Known limitation:** only the fields that exist in `supabase/migrations/0001_profiles.sql`
are real (name, headline, role, skills, links, CV filename, plan, etc.). `experience`,
`projects`, `education`, and `relatedRoles` still fall back to mock data because those
need their own relational tables — see Phase 2 below and `/docs/database-schema.md`.

**Also note:** this sandbox/build environment cannot reach `*.supabase.co` (network is
restricted to package registries), so the Supabase wiring has been built and passes
`npm run build` / `npm run lint`, but the live connection itself hasn't been
end-to-end tested against a real project. Test the flow yourself once your keys are in
`.env.local`.

## Phase 2 quickstart (opportunities, applications, notifications, sources)

1. In the Supabase SQL editor, run `supabase/migrations/0002_opportunities_and_applications.sql`.
   This creates `opportunities` (shared/global), plus `saved_opportunities`,
   `applications`, `notifications`, and `source_connections` (all private per
   user via Row Level Security).
2. Seed the shared opportunity pool with the existing mock dataset:
   ```bash
   npm run seed:opportunities
   ```
   This reads `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` (add it — find it
   in Supabase under Settings → API, next to the anon key — **never** expose
   this key to the browser or commit it) and upserts 14 opportunities. Safe
   to re-run; it upserts on `(source, external_id)` rather than duplicating.
   Add `--dry-run` to preview the rows without touching your database.
3. That's it — `OpportunityRepository`, `ApplicationRepository`,
   `NotificationRepository`, and `SourceRepository` all follow the same
   `isSupabaseConfigured` swap pattern as `UserRepository`, so they're
   already real the moment steps 1–2 are done.
4. Test it: save an opportunity, refresh — still saved. Log in as a second
   test account — they see the same opportunities but their own empty
   applications board, not yours.

**What's genuinely dynamic vs. still templated, to be precise:**
- **Match score** is computed live per viewer from their real profile skills
  vs. the opportunity's real required skills (`src/lib/engines/match-engine.ts`).
  Edit your skills in Settings, refresh Opportunities, and the match% moves.
- **Trust score** is a static column, computed once (currently copied from
  the mock dataset) — trust doesn't depend on who's looking, so this is
  correct as a stored value, not a limitation to fix later.
- **CV Fit and AI Analysis** (the written explanations) are still static
  JSONB content copied from the mock dataset — these become genuinely
  personalized once real AI is wired up per `/docs/ai-integration.md`, which
  is a separate, later phase.
- **Applications, saved items, and notifications** start empty for every new
  user (as they should) — nothing to seed there.
- **Sources**: connecting a source only persists a toggle in
  `source_connections` right now. It does not perform any real OAuth
  handshake yet — see `/docs/source-integrations.md` for what each source
  actually requires before "Connect" can mean something real.

## Phase 3 quickstart (CV + avatar storage, embedded PDF preview)

1. In the Supabase SQL editor, run `supabase/migrations/0003_storage.sql`. This creates
   the `cv-documents` (private) and `avatars` (public-read) Storage buckets, their
   access policies, and a `cv_storage_path` column on `profiles`.
2. That's it — `AvatarUpload` and `CVManager` (both in Settings) already check
   `isSupabaseConfigured` and switch to real uploads automatically.
3. Test it: upload a profile photo, refresh the page — it's still there, and it now
   shows up in the sidebar/top bar/mobile header/profile page too (previously those
   only ever showed initials). Upload a CV (PDF only — other formats are rejected with
   a message), click **View**, confirm it opens in an embedded preview.

**Design choices worth knowing:**
- **CVs are PDF-only, on purpose.** Consistent rendering across every browser, no
  legacy `.doc` edge cases, and it sets up cleanly for real text extraction in the AI
  phase. Word docs are rejected client-side with a clear message rather than silently
  failing.
- **Every user's CV lives at a fixed path** (`{user_id}/resume.pdf`), so "Replace" is
  just an upload to the same path (`upsert: true`) and "Discard" is a real delete —
  there's never more than one CV file per user sitting in storage.
- **The preview is a signed URL**, generated on-demand when you click "View" (expires
  after 60 seconds) — since the bucket is private, there's no way to guess or
  bookmark someone else's CV URL.
- **Local preview also works before upload finishes** — the moment you pick a valid
  PDF, you can view it immediately via a local blob URL, while the real upload happens
  in the background. In mock mode (no Supabase configured), this local preview is all
  you get — nothing persists past the current session, which the UI states plainly.

**What this phase does NOT do:** nothing reads the *content* of the CV yet — the CV
Analyzer's score and feedback are still templated text regardless of what's actually in
the uploaded file. Real text extraction + AI analysis of that text is a distinct, later
piece — see `/docs/ai-integration.md`.

## Phase 5 quickstart (real sources — Adzuna, Greenhouse, Lever)

**Design decision, confirmed:** this is a **shared, broad, profile-driven pool** — not
a developer-only job board. Adzuna ingestion is deliberately unfiltered (no "software
engineer" keyword tying it to tech), and Greenhouse/Lever pull every department from
each configured company (marketing, sales, finance, support, design — not just
engineering). A user's own profile and the match-engine decide what surfaces to them;
the sources themselves stay broad. Onboarding was reworked to match: the primary role
field is now open text ("what kind of work are you looking for?") instead of a fixed
dropdown, and uploading a CV can auto-suggest a role/skills via real AI extraction
(see `/docs/ai-integration.md`) — a digital marketer, a data analyst, and a frontend
developer all get an equally native onboarding experience.

1. Add your Adzuna credentials to `.env.local` (get these free at
   developer.adzuna.com — no approval process):
   ```env
   ADZUNA_APP_ID=your-app-id
   ADZUNA_APP_KEY=your-app-key
   ADZUNA_COUNTRY=us
   ```
2. Optionally edit `src/lib/sources/companies.ts` to change which companies'
   Greenhouse/Lever boards get pulled — no key needed for either, they're public
   APIs. **Read the comments in that file first** — company board tokens there are
   reasonable guesses from public sources, not independently verified (this sandbox's
   own network restrictions prevented testing them live), so some may 404 or fail.
3. Preview what would sync without writing anything:
   ```bash
   npm run sync:sources -- --dry-run
   ```
4. Run it for real:
   ```bash
   npm run sync:sources
   ```
   This upserts into the same `opportunities` table `npm run seed:opportunities`
   writes to, on the same `(source, external_id)` conflict key — safe to re-run.

**What this phase does NOT include:** this only runs when you manually run it. Actual
scheduled/automatic syncing (e.g. every hour) is Phase 6 (background jobs) — a
separate, later piece, not built in this pass.

**Skills extraction caveat:** Adzuna and company job boards don't return a structured
skills list — only free-text descriptions. `src/lib/sources/skill-vocabulary.ts`
matches a broad, multi-field keyword list (engineering, marketing, admin/VA,
analytics, design, sales, finance, HR, healthcare, and more) against each posting's
text. This is a pragmatic heuristic, not NLP — it will miss skills phrased in ways it
doesn't recognize. Extend the vocabulary list freely; a future improvement would run
extraction through Gemini per posting instead, at the cost of ingestion speed/cost.

## Phase 6 quickstart (scheduled sync — Vercel Cron, once daily)

1. In your Vercel project settings → Environment Variables, add a `CRON_SECRET`
   with any random string value (also add the same value to `.env.local` if you want
   to test the authenticated path locally).
2. Deploy. `vercel.json` already defines the schedule:
   ```json
   { "crons": [{ "path": "/api/cron/sync-sources", "schedule": "0 6 * * *" }] }
   ```
   This runs once daily at 06:00 UTC — edit the cron expression to change the time.
   **Free Hobby plan constraint:** cron frequency is capped at once per day and Vercel
   only guarantees the job fires sometime within the scheduled hour, not the exact
   minute — both are Vercel platform limits, not something this code can work around.
   Upgrading to Pro later unlocks more frequent/precise schedules if you want them.
3. That's it — Vercel calls `GET /api/cron/sync-sources` on schedule, which runs the
   exact same sync logic as `npm run sync:sources` (both now share
   `src/lib/sync/run-source-sync.ts`), including per-source error isolation (one
   failing source doesn't stop the others).
4. You can still run `npm run sync:sources` manually anytime between scheduled runs —
   nothing about adding the cron removes that.

**Security note:** the route checks the `Authorization` header Vercel automatically
attaches to cron-triggered requests against `CRON_SECRET`. If `CRON_SECRET` isn't set
at all (e.g. local dev), the check is skipped — set it in production so nobody else
can trigger a sync by just visiting the URL.

**Known limitation:** this only covers *ingestion* running on a schedule. It does not
add real-time delivery to the browser (new opportunities still require the person to
refresh/refetch) — that's Phase 7 (Realtime), a separate piece.

## Phase 7 quickstart (Realtime — live opportunities + live match notifications)

This phase is two genuinely different pieces, both included:

**Part A — live opportunity list.** New listings (e.g. from the daily Phase 6 sync)
push a lightweight Realtime event to anyone currently on the Opportunities page. This
deliberately does NOT auto-reorder the list — it shows a dismissable
**"N new opportunities just came in"** banner with a Refresh button, since silently
reshuffling a list someone's mid-browsing is worse UX than a gentle prompt.

**Part B — live match notifications.** This is the part that required building
something that didn't exist before: after every sync, `src/lib/sync/notify-matches.ts`
checks each newly-synced opportunity against every user's real profile using the same
match-engine that powers match scores elsewhere, and creates a real notification row
for anyone scoring 85%+ (configurable via `MATCH_NOTIFY_THRESHOLD` in that file).
*That* notification row is what Realtime actually pushes live to the bell icon —
without this step, "Realtime notifications" would be plumbing with nothing to deliver.

### Setup

1. Run `supabase/migrations/0004_realtime_opportunities.sql` (Realtime on
   `notifications` was already enabled back in migration 0002).
2. That's it — no new env vars. `useRealtimeNotifications` (mounted once, app-wide, in
   `AppShell`) and `useRealtimeNewOpportunities` (mounted on the Opportunities page)
   both no-op entirely in mock mode and activate automatically once Supabase is
   configured.
3. Test it: while logged in as a test user, run `npm run sync:sources` in another
   terminal. If any synced opportunity scores 85%+ against that user's real profile,
   a notification should appear without refreshing, and the Opportunities page should
   show the "new opportunities" banner.

**Cost note, stated plainly:** match-checking is an every-opportunity × every-user scan
with no batching or queue — fine at friends-testing scale, not built for real scale.
Revisit before a public launch.

## Also fixed alongside this phase: the global search bar was never wired up

Worth naming honestly: the search box in the top bar (visible on every page) was
purely decorative until this revision — a plain input with no logic behind it. It now
submits to `/opportunities?q=<term>`, and the Opportunities page's own search/filter
logic (which *was* always real) picks up that query param. The unread notification
badge in the top bar and mobile header were also silently reading from the static mock
dataset instead of the real notifications feed — also fixed as part of this pass, since
it would have undermined Realtime notifications otherwise (the badge would never have
updated even when a real notification arrived).

## 1. Supabase setup (general)

1. Create a project at https://supabase.com.
2. Copy the project URL and anon key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
   and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Copy the service role key into
   `SUPABASE_SERVICE_ROLE_KEY` — **server-side only, never `NEXT_PUBLIC_`.**
3. Create the tables described in `/docs/database-schema.md`.
4. Configure Supabase Auth (email/password and/or OAuth providers).
5. Configure Supabase Storage with a private `cv-documents` bucket for CV uploads.
6. Enable Row Level Security on every table and add policies scoping rows to
   `auth.uid()` (see `/docs/database-schema.md` for the specific policies expected).

## 2. Replace mock repositories

Each repository lives in `src/lib/repositories/*.ts` and exports a singleton. As of
this revision, all five core repositories follow the same pattern — real the moment
Supabase is configured, mock otherwise:

```ts
export const userRepository: UserRepository = isSupabaseConfigured
  ? new SupabaseUserRepository()
  : new MockUserRepository();
```

**Status: `UserRepository`, `OpportunityRepository`, `ApplicationRepository`,
`NotificationRepository`, and `SourceRepository` are all done** (Phases 1–2 above).
Use this exact pattern for anything added later — write a `Supabase*Repository` class
implementing the same interface, then export it behind the same
`isSupabaseConfigured` check. No component or hook needs to change, since they all
depend on the repository interface, not the concrete class.

## 3. Database schema

See `/docs/database-schema.md` for full table definitions. Summary of tables:

`users`, `profiles`, `skills`, `roles`, `opportunities`, `opportunity_skills`, `sources`,
`saved_opportunities`, `applications`, `cv_documents`, `cv_analyses`, `tailored_cvs`,
`interview_sessions`, `interview_questions`, `interview_answers`, `notifications`,
`source_connections`, `reports`.

## 4. Background processing

Opportunity scanning must **not** run inside the browser. In production, a scheduled
job (Supabase Edge Function on a cron trigger, or a separate worker) should run the
pipeline described in `/docs/architecture.md`:

```
Source API → fetch → normalize → deduplicate → analyze → score → store → notify
```

The `/api/opportunities/sync` route in this prototype is a placeholder that should
enqueue this job rather than run it inline.

## 5. Authentication (done — see Phase 1 quickstart above)

`src/proxy.ts` refreshes the Supabase session on every request and redirects
unauthenticated visitors to `/login`, once configured. `src/lib/supabase/client.ts` and
`src/lib/supabase/server.ts` provide the browser and server Supabase clients
respectively. `SupabaseUserRepository` reads `auth.uid()` and joins `profiles`.

## 6. Storage

CV uploads should go to a private Supabase Storage bucket (`cv-documents`), with a
signed URL generated server-side for any read. Never expose CV files publicly.

## 7. Realtime

Subscribe to `notifications` and `opportunities` tables via Supabase Realtime so new
high-match opportunities and notifications appear without a manual refetch. The
TanStack Query hooks in `src/lib/hooks/` can call `queryClient.invalidateQueries` from
a Realtime subscription callback.
