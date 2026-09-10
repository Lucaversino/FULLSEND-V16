-- FULLSEND production fixes: auth profile + imported Gecko listings
create extension if not exists pgcrypto;

create table if not exists public.gecko_listings (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'olx',
  external_id text not null,
  title text not null,
  price numeric,
  price_display text,
  external_url text not null,
  city text,
  state text,
  neighborhood text,
  ddd text,
  brand text,
  model text,
  year integer,
  mileage integer,
  fuel text,
  transmission text,
  color text,
  vehicle_type text,
  engine_power text,
  features text,
  category text,
  category_id integer,
  image_url text,
  images jsonb default '[]'::jsonb,
  image_count integer default 0,
  professional_ad boolean default false,
  featured boolean default false,
  chat_enabled boolean default false,
  listed_at timestamptz,
  raw_data jsonb,
  status text not null default 'active',
  imported_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(source, external_id)
);

alter table public.gecko_listings enable row level security;
grant usage on schema public to anon, authenticated, service_role;
grant select on public.gecko_listings to anon, authenticated;
grant all privileges on public.gecko_listings to service_role;
drop policy if exists "public read active gecko listings" on public.gecko_listings;
create policy "public read active gecko listings" on public.gecko_listings for select to anon,authenticated using(status='active');
create index if not exists gecko_listings_state_idx on public.gecko_listings(state);
create index if not exists gecko_listings_city_idx on public.gecko_listings(city);
create index if not exists gecko_listings_brand_idx on public.gecko_listings(brand);
create index if not exists gecko_listings_model_idx on public.gecko_listings(model);
create index if not exists gecko_listings_price_idx on public.gecko_listings(price);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  city text,
  state text,
  whatsapp text,
  avatar_url text,
  bio text,
  instagram text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,name,city,state,whatsapp)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'name',''),
    new.raw_user_meta_data->>'city',
    upper(new.raw_user_meta_data->>'state'),
    new.raw_user_meta_data->>'whatsapp'
  )
  on conflict(id) do update set
    name=excluded.name,
    city=excluded.city,
    state=excluded.state,
    whatsapp=excluded.whatsapp,
    updated_at=now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of raw_user_meta_data on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles for select using(true);
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles for update using(auth.uid()=id) with check(auth.uid()=id);

grant select on public.profiles to anon,authenticated;
grant update on public.profiles to authenticated;
