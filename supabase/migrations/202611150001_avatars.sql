-- SkyStop: optional profile picture. Additive. A private Storage bucket 'avatars' where each user can read and write
-- only files under a folder named after their own user id ("<uid>/avatar.jpg"). The app resizes pictures in the
-- browser (256 px JPEG) before upload. Display name lives in Supabase Auth user metadata (no table change).
-- Guarded: skipped where the Supabase `storage` schema does not exist (e.g. the local PGlite regression harness).
do $$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'storage schema not present: avatars bucket skipped';
    return;
  end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('avatars', 'avatars', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;
  execute 'drop policy if exists avatars_owner_select on storage.objects';
  execute 'drop policy if exists avatars_owner_insert on storage.objects';
  execute 'drop policy if exists avatars_owner_update on storage.objects';
  execute 'drop policy if exists avatars_owner_delete on storage.objects';
  execute $p$create policy avatars_owner_select on storage.objects for select to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
  execute $p$create policy avatars_owner_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
  execute $p$create policy avatars_owner_update on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
  execute $p$create policy avatars_owner_delete on storage.objects for delete to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
end $$;
