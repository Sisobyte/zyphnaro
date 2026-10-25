-- Zyphnaro — enables the real "Save an opportunity -> lands in the Saved
-- column -> drag to Applied" flow described in the product spec.
--
-- Previously, the Save button only ever wrote to `saved_opportunities` (a
-- simple bookmark flag) and never created a row in `applications` at all —
-- so the Applications Kanban board had no code path that could ever
-- populate it for a real user.
--
-- This adds a unique (user_id, opportunity_id) constraint so the app can
-- safely upsert-with-do-nothing when the Save button is clicked: saving the
-- same opportunity twice never creates a duplicate row, and an application
-- the user has already progressed (preparing/applied/interview/offer/
-- rejected) is never silently reset back to "saved".

alter table public.applications
  add constraint applications_user_opportunity_unique unique (user_id, opportunity_id);
