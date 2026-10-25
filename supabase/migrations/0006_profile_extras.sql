-- Zyphnaro — adds columns for previously-disconnected/unmigrated profile
-- fields:
--
-- 1. `min_match_score` — the "Minimum match score to notify" control in
--    Settings had no real column to save to; it was a decorative dropdown
--    with no persistence at all.
-- 2. `experience`, `projects`, `education` — CV extraction (Gemini) can
--    now pull these from an uploaded CV, but there was nowhere real to
--    store them; they always fell back to an empty/mock state. Stored as
--    JSONB arrays here (a pragmatic v1, same pattern as `opportunities`'
--    company/salary columns) rather than fully normalized tables — see
--    /docs/database-schema.md for the fully-normalized target shape.

alter table public.profiles
  add column if not exists min_match_score int default 80,
  add column if not exists experience jsonb not null default '[]'::jsonb,
  add column if not exists projects jsonb not null default '[]'::jsonb,
  add column if not exists education jsonb not null default '[]'::jsonb;
