# Database Schema

> **Note:** this document describes the fully-normalized target schema. The actual
> Phase 1–2 migrations that are live today (`supabase/migrations/0001_profiles.sql` and
> `0002_opportunities_and_applications.sql`) are a pragmatic subset of this — notably,
> `company`, `author`, `salary`, `trust`, `cv_fit`, and `ai_analysis` are stored as
> JSONB columns on `opportunities` rather than split into separate normalized tables,
> and `experience` / `projects` / `education` / `roles` aren't migrated yet (they still
> come from mock data — see `SupabaseUserRepository`'s `rowToProfile` for exactly which
> fields are real). Treat the tables below as the direction to grow toward, not as
> what's running right now.

This document describes the Supabase (Postgres) schema that the mock repositories in
`src/lib/repositories/` are designed to be replaced by. Types below are illustrative —
adjust precision/constraints as needed. All tables scoped to a user should have Row
Level Security enabled with a policy like `user_id = auth.uid()`.

## `users`

Managed by Supabase Auth (`auth.users`). Not created manually.

## `profiles`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | references `auth.users.id` |
| name | text | |
| headline | text | |
| primary_role | text | |
| seniority | text | intern/junior/mid/senior/lead |
| years_experience | int | |
| location | text | |
| preferred_locations | text[] | |
| remote_preference | text | remote-only/remote-first/hybrid/onsite |
| employment_types | text[] | |
| salary_min | int | |
| salary_max | int | |
| salary_currency | text | |
| salary_period | text | |
| portfolio_url | text | nullable |
| github_url | text | nullable |
| linkedin_url | text | nullable |
| availability | text | |
| cv_score | int | denormalized latest CV score |
| plan | text | free/pro/career-agent |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: `profiles.id = auth.uid()` for select/update.

## `skills`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| name | text | |
| created_at | timestamptz | |

## `roles`

Related/adjacent roles for a user's Role Explorer.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| title | text | |
| relation | text | related/adjacent |
| overlap_percent | int | |
| reason | text | |
| is_primary | boolean | |

## `opportunities`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| source | text | |
| external_id | text | unique with `source` |
| title | text | |
| description | text | |
| company_name | text | |
| company_website | text | nullable |
| company_domain_verified | boolean | |
| author_name | text | nullable |
| author_role | text | nullable |
| author_source_profile_url | text | nullable |
| location | text | nullable |
| work_type | text | remote/hybrid/onsite |
| employment_type | text | full-time/part-time/contract/freelance/internship |
| seniority | text | |
| salary_min | int | nullable |
| salary_max | int | nullable |
| salary_currency | text | nullable |
| salary_period | text | nullable |
| posted_at | timestamptz | |
| detected_at | timestamptz | |
| original_url | text | |
| match_score | int | denormalized, per-user matches live in a join table if scores are personalized |
| trust_score | int | |
| trust_level | text | low-concern/potential-concern/high-risk |
| status | text | new/saved/applied/closed |
| created_at | timestamptz | |

Note: if match/trust scores are personalized per user (recommended), move `match_score`
and related fields to a `user_opportunity_scores` join table keyed by `(user_id,
opportunity_id)` instead of storing them directly on `opportunities`.

## `opportunity_skills`

| Column | Type | Notes |
|---|---|---|
| opportunity_id | uuid, FK | |
| skill | text | |

## `sources`

| Column | Type | Notes |
|---|---|---|
| id | text, PK | e.g. "reddit", "adzuna" |
| name | text | |
| requires_auth | boolean | |

## `saved_opportunities`

| Column | Type | Notes |
|---|---|---|
| user_id | uuid, FK → profiles.id | |
| opportunity_id | uuid, FK → opportunities.id | |
| saved_at | timestamptz | |

Primary key: `(user_id, opportunity_id)`. RLS: `user_id = auth.uid()`.

## `applications`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| opportunity_id | uuid, FK → opportunities.id | |
| stage | text | saved/preparing/applied/interview/offer/rejected |
| saved_at | timestamptz | |
| applied_at | timestamptz | nullable |
| recruiter | text | nullable |
| next_action | text | nullable |

RLS: `user_id = auth.uid()`.

## `cv_documents`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| storage_path | text | path in the private `cv-documents` Storage bucket |
| file_name | text | |
| uploaded_at | timestamptz | |

RLS: `user_id = auth.uid()`. Storage bucket policy should mirror this.

## `cv_analyses`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| cv_document_id | uuid, FK, nullable | |
| overall_score | int | |
| ats_compatibility | int | |
| skills_coverage | int | |
| experience_relevance | int | |
| project_relevance | int | |
| keywords_score | int | |
| structure_score | int | |
| clarity_score | int | |
| missing_keywords | text[] | |
| strong_keywords | text[] | |
| feedback | text[] | |
| created_at | timestamptz | |

## `tailored_cvs`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| opportunity_id | uuid, FK → opportunities.id | |
| original_score | int | |
| tailored_score | int | |
| highlighted_skills | text[] | |
| recommended_changes | text[] | |
| project_recommendations | text[] | |
| summary | text | |
| created_at | timestamptz | |

## `interview_sessions`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| mode | text | technical/behavioral/role-focused/company/full-mock |
| difficulty | text | friendly/realistic/challenging |
| duration_minutes | int | |
| readiness | int | nullable, set at completion |
| technical_knowledge | int | nullable |
| communication | int | nullable |
| problem_solving | int | nullable |
| role_knowledge | int | nullable |
| started_at | timestamptz | |
| completed_at | timestamptz | nullable |

## `interview_questions`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| session_id | uuid, FK → interview_sessions.id | |
| category | text | |
| prompt | text | |
| order_index | int | |

## `interview_answers`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| question_id | uuid, FK → interview_questions.id | |
| answer | text | |
| strength | text | weak/solid/strong |
| feedback | text | |
| follow_up_triggered | boolean | |

## `notifications`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| type | text | match/concern/cv/interview/application |
| priority | text | normal/high |
| title | text | |
| body | text | |
| opportunity_id | uuid, FK, nullable | |
| read | boolean | default false |
| created_at | timestamptz | |

RLS: `user_id = auth.uid()`. Enable Realtime on this table.

## `source_connections`

| Column | Type | Notes |
|---|---|---|
| user_id | uuid, FK → profiles.id | |
| source_id | text, FK → sources.id | |
| status | text | connected/available/active/limited/planned |
| opportunities_discovered | int | |
| last_sync | timestamptz | nullable |
| access_token | text | nullable, encrypted at rest, never returned to the client |

Primary key: `(user_id, source_id)`. RLS: `user_id = auth.uid()`.

## `reports`

User-submitted reports of suspicious listings, feeding the trust engine over time.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| opportunity_id | uuid, FK → opportunities.id | |
| reason | text | |
| created_at | timestamptz | |
