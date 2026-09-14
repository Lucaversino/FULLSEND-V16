-- FULLSEND V16.8.1 — reparo seguro de publicação de anúncios
-- Corrige "permission denied for table listings" sem remover RLS.

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.listings to authenticated;
grant all privileges on table public.listings to service_role;

alter table public.listings enable row level security;

drop policy if exists "listings_owner_insert" on public.listings;
create policy "listings_owner_insert" on public.listings
for insert to authenticated
with check (
  auth.uid()=user_id
  and source='fullsend'
  and status in ('active','draft','pending')
);

drop policy if exists "listings_owner_update" on public.listings;
create policy "listings_owner_update" on public.listings
for update to authenticated
using (
  auth.uid()=user_id
  or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
)
with check (
  auth.uid()=user_id
  or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

drop policy if exists "listings_owner_delete" on public.listings;
create policy "listings_owner_delete" on public.listings
for delete to authenticated
using (
  auth.uid()=user_id
  or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

-- Leitura pública continua exatamente como já funcionava.
drop policy if exists "listings_public_read" on public.listings;
create policy "listings_public_read" on public.listings
for select to anon,authenticated
using (
  status='active'
  or auth.uid()=user_id
  or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);
