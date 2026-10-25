-- Zyphnaro — Role Explorer's "Add role" and "Remove" buttons only ever
-- changed in-memory React state (setCustomRole/removed Set), never
-- persisted anywhere — so every refresh silently threw the changes away.
-- There was no real column to persist to at all. This adds one.

alter table public.profiles
  add column if not exists related_roles jsonb not null default '[]'::jsonb;
