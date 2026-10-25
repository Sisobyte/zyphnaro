# Source Integration Guide

Every source implements the `JobSource` interface (`src/lib/services/sources/job-source.ts`).
This document covers what each source provides, how to authenticate, and any
restrictions on access. **Never scrape a platform in a way that violates its terms of
service** — sources without a supported public API are marked "Requires partnership /
approval" and should not be accessed by scraping.

## Status: implemented vs. mock

**Adzuna, Greenhouse, and Lever have real implementations** (`src/lib/services/sources/
adzuna-source.ts`, `greenhouse-source.ts`, `lever-source.ts`), run via
`npm run sync:sources` — see the "Phase 5 quickstart" in `/docs/backend-integration.md`.
**Reddit, Upwork, and Freelancer remain mock** (`src/lib/services/sources/mock-adapters.ts`)
for the reasons detailed in their sections below. **LinkedIn, Indeed, and Wellfound**
have no adapter at all yet — see the "Planned" table at the bottom.

## Design principle: broad ingestion, personalized matching

Zyphnaro is built around **whatever work a person actually wants**, not a fixed list of
developer job titles. Concretely, this means:

- Adzuna ingestion is **deliberately unfiltered** — no `what=` keyword tying the search
  to tech/engineering. Marketing, admin, analytics, healthcare, retail, and every other
  field a user might search for comes through the same pipeline.
- Greenhouse/Lever adapters pull **every department** from each configured company —
  marketing, sales, finance, support, design, recruiting — not just engineering roles,
  even though the companies on the current starter list mostly happen to be tech
  companies (see the honesty note in `src/lib/sources/companies.ts` about why true
  cross-industry diversity comes from Adzuna, not from hand-picking companies).
- A user's own profile (open-text "what kind of work are you looking for," not a fixed
  dropdown) and the match-engine (`src/lib/engines/match-engine.ts`) decide what
  surfaces to *them* — the ingestion layer stays deliberately broad and un-opinionated.

## Reddit

- **Provides**: public posts from hiring-related subreddits (e.g. r/forhire, r/remotejs).
- **Auth**: OAuth2 app-only auth via `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`.
- **API**: `https://oauth.reddit.com` (see Reddit API docs).
- **Rate limits**: ~60 requests/minute per OAuth client (subject to change).
- **User connection required?**: No — app-only auth is sufficient for public posts.
- **Public data access**: Yes, subreddit posts are public.
- **Mapping**: post title → `title`, post body → `description`, post author → `author`,
  post permalink → `originalUrl`, `created_utc` → `postedAt`.

## Upwork

- **Provides**: freelance contracts matching skill/category filters.
- **Auth**: OAuth2, requires an approved Upwork API application.
- **API**: Upwork GraphQL/REST API (subject to Upwork's developer program approval).
- **Rate limits**: per Upwork's published limits for the API tier granted.
- **User connection required?**: Yes — a connected Upwork account is needed for
  personalized freelance search.
- **Public data access**: Limited; most useful endpoints require an authenticated user.
- **Mapping**: job title → `title`, job description → `description`, budget → `salary`,
  skills → `skills`, job URL → `originalUrl`.

## Freelancer

- **Provides**: freelance jobs and contests.
- **Auth**: OAuth2 via the Freelancer API.
- **API**: `https://www.freelancer.com/api/`.
- **Rate limits**: per Freelancer's published API limits.
- **User connection required?**: Yes.
- **Public data access**: Limited public project listing endpoints exist.
- **Mapping**: project title → `title`, description → `description`, budget → `salary`,
  jobs/skills → `skills`.

## Adzuna — implemented (`adzuna-source.ts`)

- **Provides**: aggregated job listings across many boards.
- **Auth**: API key pair (`ADZUNA_APP_ID` / `ADZUNA_APP_KEY`), no user OAuth needed.
- **API**: `https://api.adzuna.com/v1/api/jobs/{country}/search/{page}`.
- **Rate limits**: per Adzuna's free/paid tier (typically a few thousand calls/month
  on the free tier).
- **User connection required?**: No.
- **Public data access**: Yes, this is a public search API.
- **Mapping**: `title`, `description`, `company.display_name` → `company.name`,
  `salary_min`/`salary_max` → `salary`, `redirect_url` → `originalUrl`.

## Greenhouse — implemented (`greenhouse-source.ts`)

- **Provides**: direct company career pages that use Greenhouse as their ATS.
- **Auth**: none required for the public job board API.
- **API**: `https://boards-api.greenhouse.io/v1/boards/{company}/jobs`.
- **Rate limits**: generous for the public job board endpoint; be a good citizen with
  caching and reasonable polling intervals.
- **User connection required?**: No.
- **Public data access**: Yes.
- **Mapping**: `title`, `content` (HTML) → `description`, `location.name` → `location`,
  `absolute_url` → `originalUrl`.

## Lever — implemented (`lever-source.ts`)

- **Provides**: direct company career pages that use Lever as their ATS.
- **Auth**: none required for the public postings API.
- **API**: `https://api.lever.co/v0/postings/{company}`.
- **Rate limits**: generous for the public postings endpoint; cache and poll reasonably.
- **User connection required?**: No.
- **Public data access**: Yes.
- **Mapping**: `text` → `title`, `descriptionPlain` → `description`,
  `categories.location` → `location`, `hostedUrl` → `originalUrl`.

## Planned / requires approval

These are placeholders in this prototype and are **not implemented** — each requires
partnership approval, a compliance review, or has no supported public API for this use
case. Do not scrape them.

| Source | Status | Notes |
|---|---|---|
| LinkedIn | Limited | Only public job search results are accessible without a partnership; full access requires LinkedIn Talent/Partner API approval. |
| Indeed | Planned | Requires publisher/API partnership approval. |
| Wellfound | Planned | No general-purpose public API at time of writing; pending review. |
| Remote OK | Planned | Has a public JSON feed for some use cases; confirm current terms before integrating. |
| We Work Remotely | Planned | Confirm current terms before integrating. |
| Remotive | Planned | Has a public API for some use cases; confirm current terms before integrating. |

## Adding a new source

1. Add credentials to `.env.example` and `.env.local`.
2. Create `src/lib/services/sources/{name}-source.ts` implementing `JobSource`.
3. Implement `fetchOpportunities()` to call the real API, and `normalizeOpportunity()`
   to map the raw response into the `Opportunity` model (`src/lib/types/opportunity.ts`).
4. Register the adapter in `allSourceAdapters` (`src/lib/services/sources/mock-adapters.ts`).
5. Add a row to `mockSources` (or the real `source_connections` table) so it shows up
   on the Sources page.
