-- Zyphnaro — lets a person switch off new-job match alerts.
--
-- "High-match alerts" in Settings used to be a switch that did nothing. This
-- column stores it, and the sync's notifyMatchesForOpportunities() now skips
-- anyone who has it off. Defaults to on, so existing users keep getting alerts.

alter table public.profiles
  add column if not exists notify_high_match boolean not null default true;
