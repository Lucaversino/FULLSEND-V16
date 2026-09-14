-- FULLSEND V17.2.4.2
-- Correção definitiva do erro:
-- ERROR 42P16: cannot drop columns from view

begin;

alter table public.listings
  add column if not exists listing_mode text not null default 'classified';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname='listings_listing_mode_check'
      and conrelid='public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_listing_mode_check
      check (listing_mode in ('classified','garage'));
  end if;
end $$;

update public.listings
set listing_mode='classified'
where listing_mode is null
   or listing_mode not in ('classified','garage');

create index if not exists listings_user_mode_created_idx
  on public.listings(user_id,listing_mode,created_at desc);

create index if not exists listings_public_mode_status_idx
  on public.listings(listing_mode,status)
  where status='active';

drop view if exists public.listings_public;

create view public.listings_public as
select
  id,
  user_id,
  category_slug,
  title,
  slug,
  description,
  price,
  city,
  state,
  whatsapp,
  cover_url,
  media,
  tags,
  status,
  source,
  external_url,
  is_featured,
  is_vip,
  created_at
from public.listings
where status='active'
  and coalesce(listing_mode,'classified')='classified';

grant select on public.listings_public to anon,authenticated;

commit;
