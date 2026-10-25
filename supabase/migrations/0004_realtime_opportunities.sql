-- Zyphnaro — Phase 7 migration: enable Realtime on `opportunities`.
--
-- `notifications` already had Realtime enabled in migration 0002. This adds
-- the same to `opportunities`, so the client can subscribe to new listings
-- arriving (e.g. from the daily sync in Phase 6) without polling/refetching.
--
-- Note: the existing RLS policy on `opportunities` ("Any signed-in user can
-- read opportunities") already governs what a Realtime subscriber can see —
-- no separate Realtime-specific policy is needed.

alter publication supabase_realtime add table public.opportunities;
