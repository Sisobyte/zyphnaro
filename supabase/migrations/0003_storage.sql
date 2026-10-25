-- Zyphnaro — Phase 3 migration: file storage for CVs and avatars.
--
-- Creates two Storage buckets and their access policies, plus two new
-- columns on `profiles` to track exactly where each user's files live.
--
-- Design:
-- - `cv-documents` is PRIVATE. CVs are PDF-only (enforced client-side and
--   again here via a MIME-type check on upload). Every file lives at a
--   fixed path `{user_id}/resume.pdf`, so "replace" is just an upsert to
--   the same path and "discard" is a delete — no orphaned old versions.
-- - `avatars` is PUBLIC-READ (profile photos are meant to be visible), but
--   writes are still locked to each user's own folder.
-- - Both buckets use the same storage.objects RLS pattern: the first path
--   segment of the object's name must equal the caller's auth.uid().

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cv-documents', 'cv-documents', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- cv-documents policies (private — owner only, in both directions)
create policy "Users manage their own CV files"
  on storage.objects for all
  using (bucket_id = 'cv-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'cv-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- avatars policies (public read, owner-only write)
create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users manage their own avatar file"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update their own avatar file"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete their own avatar file"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Track exactly where each user's CV lives (the avatar's location is
-- derivable from avatar_url directly, which already exists on `profiles`
-- since migration 0001).
alter table public.profiles add column if not exists cv_storage_path text;
