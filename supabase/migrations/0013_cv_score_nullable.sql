-- Zyphnaro — distinguishes "never analyzed" from "analyzed, scored 0".
--
-- `cv_score` defaulted to 0, so every profile started at 0 and there was no
-- way to tell a genuinely low score apart from one that had simply never
-- been computed. Combined with the general CV analysis never actually
-- persisting (see below), every real user's score has been stuck at 0 the
-- whole time — so it's safe to assume every existing 0 here means "never
-- analyzed", not "scored zero", and backfill it to NULL.

alter table public.profiles alter column cv_score drop default;

update public.profiles set cv_score = null where cv_score = 0;
