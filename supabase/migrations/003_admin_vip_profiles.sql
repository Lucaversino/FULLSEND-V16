-- FULLSEND Admin / Selos / Destaques / Avatar
-- Execute este arquivo uma única vez no SQL Editor do Supabase.

alter table public.profiles
  add column if not exists badge text not null default 'new',
  add column if not exists account_status text not null default 'active',
  add column if not exists last_admin_note text;

do $$ begin
  alter table public.profiles add constraint profiles_badge_check
    check (badge in ('new','vip','premium','admin','none'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint profiles_account_status_check
    check (account_status in ('active','suspended','blocked'));
exception when duplicate_object then null; end $$;

alter table public.listings
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_vip boolean not null default false,
  add column if not exists admin_note text;

alter table if exists public.gecko_listings
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_vip boolean not null default false,
  add column if not exists admin_note text;

create index if not exists listings_featured_idx on public.listings(status,is_featured,is_vip);
create index if not exists profiles_badge_idx on public.profiles(badge);

-- Avatar de perfil
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-avatars','profile-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "avatar_public_read" on storage.objects for select
using(bucket_id='profile-avatars');

create policy "avatar_owner_insert" on storage.objects for insert to authenticated
with check(bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "avatar_owner_update" on storage.objects for update to authenticated
using(bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "avatar_owner_delete" on storage.objects for delete to authenticated
using(bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text);

-- Operações administrativas usam a SERVICE ROLE somente no servidor.

-- Atualiza o perfil criado automaticamente com selo de novo membro.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,name,city,state,whatsapp,badge)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'name',''),
    new.raw_user_meta_data->>'city',
    upper(new.raw_user_meta_data->>'state'),
    new.raw_user_meta_data->>'whatsapp',
    'new'
  ) on conflict(id) do nothing;
  return new;
end;$$;

-- Mantém a view pública atualizada com os novos campos de destaque.
drop view if exists public.listings_public;
create view public.listings_public as
select id,user_id,category_slug,title,slug,description,price,city,state,whatsapp,
       cover_url,media,tags,status,source,external_url,is_featured,is_vip,created_at
from public.listings where status='active';
grant select on public.listings_public to anon,authenticated;
