-- FULLSEND V16.8 — Eventos Automotivos
-- Módulo isolado: não altera tabelas existentes de anúncios/home.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  slug text not null unique,
  title text not null,
  description text,
  category text not null default 'Outros',
  event_date date not null,
  end_date date,
  event_time time,
  venue text,
  address text,
  city text,
  state text,
  country text not null default 'BR',
  latitude double precision,
  longitude double precision,
  image_url text,
  ticket_url text,
  source_url text,
  source text not null default 'fullsend',
  status text not null default 'pending'
    check (status in ('pending','published','rejected')),
  featured boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(event_id,user_id)
);

create index if not exists events_event_date_idx on public.events(event_date);
create index if not exists events_state_idx on public.events(state);
create index if not exists events_city_idx on public.events(city);
create index if not exists events_category_idx on public.events(category);
create index if not exists events_status_idx on public.events(status);
create index if not exists events_featured_idx on public.events(featured desc,event_date);
create index if not exists events_public_listing_idx
  on public.events(status,featured desc,event_date,created_at desc);
create index if not exists event_attendees_event_idx on public.event_attendees(event_id);
create index if not exists event_attendees_user_idx on public.event_attendees(user_id);

alter table public.events enable row level security;
alter table public.event_attendees enable row level security;

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events
for select using (
  status='published'
  or created_by=auth.uid()
  or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

drop policy if exists "events_user_suggest" on public.events;
create policy "events_user_suggest" on public.events
for insert to authenticated
with check (
  created_by=auth.uid()
  and status='pending'
  and source='fullsend'
  and featured=false
);

drop policy if exists "events_owner_pending_update" on public.events;
create policy "events_owner_pending_update" on public.events
for update to authenticated
using (created_by=auth.uid() and status='pending')
with check (created_by=auth.uid() and status='pending' and featured=false);

drop policy if exists "attendees_public_read" on public.event_attendees;
create policy "attendees_public_read" on public.event_attendees
for select using (true);

drop policy if exists "attendees_own_insert" on public.event_attendees;
create policy "attendees_own_insert" on public.event_attendees
for insert to authenticated
with check (user_id=auth.uid());

drop policy if exists "attendees_own_delete" on public.event_attendees;
create policy "attendees_own_delete" on public.event_attendees
for delete to authenticated
using (user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'event-images',
  'event-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict(id) do update
set public=true,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "event_images_public_read" on storage.objects;
create policy "event_images_public_read" on storage.objects
for select using(bucket_id='event-images');

drop policy if exists "event_images_auth_insert" on storage.objects;
create policy "event_images_auth_insert" on storage.objects
for insert to authenticated
with check(
  bucket_id='event-images'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "event_images_owner_delete" on storage.objects;
create policy "event_images_owner_delete" on storage.objects
for delete to authenticated
using(
  bucket_id='event-images'
  and (storage.foldername(name))[1]=auth.uid()::text
);

-- Paginação/filtros reais no banco, inclusive distância por Haversine.
create or replace function public.search_events(
  p_page integer default 1,
  p_page_size integer default 12,
  p_state text default null,
  p_city text default null,
  p_category text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null
)
returns jsonb
language sql
stable
security invoker
set search_path=public
as $$
with params as (
  select
    greatest(coalesce(p_page,1),1) page_no,
    least(greatest(coalesce(p_page_size,12),1),50) page_size,
    nullif(upper(btrim(p_state)),'') state_q,
    nullif(btrim(p_city),'') city_q,
    nullif(btrim(p_category),'') category_q
),
base as (
  select
    e.*,
    case
      when p_lat is null or p_lng is null or e.latitude is null or e.longitude is null then null
      else 6371 * acos(
        least(1.0,greatest(-1.0,
          cos(radians(p_lat))*cos(radians(e.latitude))*cos(radians(e.longitude)-radians(p_lng))
          + sin(radians(p_lat))*sin(radians(e.latitude))
        ))
      )
    end as distance_km,
    (select count(*) from public.event_attendees ea where ea.event_id=e.id) as attendees_count
  from public.events e
  where e.status='published'
),
filtered as (
  select b.*
  from base b cross join params p
  where
    (p.state_q is null or upper(coalesce(b.state,''))=p.state_q)
    and (p.city_q is null or coalesce(b.city,'') ilike '%'||p.city_q||'%')
    and (p.category_q is null or p.category_q='Todos' or b.category=p.category_q)
    and (p_date_from is null or b.event_date>=p_date_from)
    and (p_date_to is null or b.event_date<=p_date_to)
    and (
      p_radius_km is null
      or p_lat is null
      or p_lng is null
      or (b.distance_km is not null and b.distance_km<=p_radius_km)
    )
),
ordered as (
  select f.*,
    row_number() over(
      order by
        f.featured desc,
        case when p_lat is not null and p_lng is not null then f.distance_km end asc nulls last,
        f.event_date asc,
        f.event_time asc nulls last,
        f.created_at desc
    ) rn
  from filtered f
),
paged as (
  select o.*
  from ordered o cross join params p
  where o.rn>((p.page_no-1)*p.page_size)
    and o.rn<=(p.page_no*p.page_size)
  order by o.rn
)
select jsonb_build_object(
  'total',(select count(*) from filtered),
  'page',(select page_no from params),
  'page_size',(select page_size from params),
  'items',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',pg.id,
      'slug',pg.slug,
      'title',pg.title,
      'description',pg.description,
      'category',pg.category,
      'event_date',pg.event_date,
      'end_date',pg.end_date,
      'event_time',pg.event_time,
      'venue',pg.venue,
      'address',pg.address,
      'city',pg.city,
      'state',pg.state,
      'country',pg.country,
      'latitude',pg.latitude,
      'longitude',pg.longitude,
      'image_url',pg.image_url,
      'ticket_url',pg.ticket_url,
      'source_url',pg.source_url,
      'source',pg.source,
      'featured',pg.featured,
      'distance_km',pg.distance_km,
      'attendees_count',pg.attendees_count
    ) order by pg.rn)
    from paged pg
  ),'[]'::jsonb)
);
$$;

grant execute on function public.search_events(
  integer,integer,text,text,text,date,date,
  double precision,double precision,double precision
) to anon,authenticated;
