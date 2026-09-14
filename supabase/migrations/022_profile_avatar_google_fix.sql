-- FULLSEND V16.9.2
-- Repara upload de foto de perfil para qualquer usuário autenticado,
-- inclusive contas criadas/login via Google OAuth.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict(id) do update
set public=true,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "avatar_public_read" on storage.objects;
drop policy if exists "avatar_owner_insert" on storage.objects;
drop policy if exists "avatar_owner_update" on storage.objects;
drop policy if exists "avatar_owner_delete" on storage.objects;

create policy "avatar_public_read"
on storage.objects for select
using(bucket_id='profile-avatars');

create policy "avatar_owner_insert"
on storage.objects for insert
to authenticated
with check(
  bucket_id='profile-avatars'
  and (storage.foldername(name))[1]=auth.uid()::text
);

create policy "avatar_owner_update"
on storage.objects for update
to authenticated
using(
  bucket_id='profile-avatars'
  and (storage.foldername(name))[1]=auth.uid()::text
)
with check(
  bucket_id='profile-avatars'
  and (storage.foldername(name))[1]=auth.uid()::text
);

create policy "avatar_owner_delete"
on storage.objects for delete
to authenticated
using(
  bucket_id='profile-avatars'
  and (storage.foldername(name))[1]=auth.uid()::text
);

grant select,update on public.profiles to authenticated;
