-- FULLSEND V16.6 - paginação pública real no banco
-- Une anúncios FULLSEND + parceiros e devolve SOMENTE a página solicitada.
-- Não cria tabelas duplicadas e usa exclusivamente as tabelas/colunas existentes.

create or replace function public.search_public_listings(
  p_page integer default 1,
  p_page_size integer default 15,
  p_query text default null,
  p_state text default null,
  p_city text default null,
  p_category text default null,
  p_brand text default null,
  p_model text default null,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_year_min integer default null,
  p_year_max integer default null,
  p_km_min integer default null,
  p_km_max integer default null,
  p_fuel text default null,
  p_transmission text default null,
  p_style text default null,
  p_sort text default 'recent'
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with params as (
  select
    greatest(coalesce(p_page, 1), 1) as page_no,
    least(greatest(coalesce(p_page_size, 15), 1), 50) as page_size,
    nullif(btrim(p_query), '') as q,
    nullif(upper(btrim(p_state)), '') as state_q,
    nullif(btrim(p_city), '') as city_q,
    nullif(btrim(p_category), '') as category_q,
    nullif(btrim(p_brand), '') as brand_q,
    nullif(btrim(p_model), '') as model_q,
    nullif(btrim(p_fuel), '') as fuel_q,
    nullif(btrim(p_transmission), '') as transmission_q,
    nullif(btrim(p_style), '') as style_q,
    coalesce(nullif(btrim(p_sort), ''), 'recent') as sort_q
),
unified as (
  select
    l.id::text as id,
    'fullsend'::text as kind,
    l.title,
    l.price,
    l.city,
    l.state,
    l.cover_url,
    l.slug,
    null::text as external_url,
    null::text as brand,
    null::text as model,
    null::integer as year,
    null::integer as mileage,
    null::text as fuel,
    null::text as transmission,
    l.category_slug,
    coalesce(l.is_featured, false) as is_featured,
    coalesce(l.is_vip, false) as is_vip,
    l.created_at as sort_date,
    concat_ws(' ', l.title, l.description, l.city, l.state, array_to_string(l.tags, ' '), l.category_slug) as search_text,
    jsonb_build_object(
      'id', pr.id,
      'name', pr.name,
      'avatar_url', pr.avatar_url,
      'badge', pr.badge
    ) as seller
  from public.listings l
  left join public.profiles pr on pr.id = l.user_id
  where l.status = 'active'

  union all

  select
    g.id::text as id,
    'gecko'::text as kind,
    g.title,
    g.price,
    g.city,
    g.state,
    g.image_url as cover_url,
    null::text as slug,
    g.external_url,
    g.brand,
    g.model,
    g.year,
    g.mileage,
    g.fuel,
    g.transmission,
    case
      when lower(coalesce(g.import_search_category,'')) = 'vehicles' then 'carros'
      when lower(coalesce(g.import_search_category,'')) in ('engine_parts','performance') then 'motores'
      when lower(coalesce(g.import_search_category,'')) = 'wheels_tires' then 'rodas'
      when lower(coalesce(g.import_search_category,'')) = 'suspension' then 'suspensao'
      when lower(coalesce(g.import_search_category,'')) = 'audio' then 'som'
      when lower(coalesce(g.import_search_category,'')) = 'accessories' then 'acessorios'
      when lower(coalesce(g.category,'')) ~ '(motor|turbo|turbina|injec)' then 'motores'
      when lower(coalesce(g.category,'')) ~ '(roda|pneu)' then 'rodas'
      when lower(coalesce(g.category,'')) ~ 'suspens' then 'suspensao'
      when lower(coalesce(g.category,'')) ~ '(som|audio)' then 'som'
      when lower(coalesce(g.category,'')) ~ '(acessor|peca)' then 'acessorios'
      else 'carros'
    end as category_slug,
    coalesce(g.is_featured, false) as is_featured,
    coalesce(g.is_vip, false) as is_vip,
    coalesce(g.listed_at, g.imported_at) as sort_date,
    concat_ws(' ', g.title, g.brand, g.model, g.features, g.city, g.state, g.category, g.raw_data::text) as search_text,
    null::jsonb as seller
  from public.gecko_listings g
  where g.status = 'active'
),
filtered as (
  select u.*
  from unified u
  cross join params p
  where
    (p.q is null or u.search_text ilike '%' || p.q || '%')
    and (p.state_q is null or upper(coalesce(u.state,'')) = p.state_q)
    and (p.city_q is null or coalesce(u.city,'') ilike '%' || p.city_q || '%')
    and (p.category_q is null or u.category_slug = p.category_q)
    and (p.brand_q is null or coalesce(u.brand,'') ilike '%' || p.brand_q || '%')
    and (p.model_q is null or coalesce(u.model,'') ilike '%' || p.model_q || '%')
    and (p_price_min is null or u.price >= p_price_min)
    and (p_price_max is null or u.price <= p_price_max)
    and (p_year_min is null or u.year >= p_year_min)
    and (p_year_max is null or u.year <= p_year_max)
    and (p_km_min is null or u.mileage >= p_km_min)
    and (p_km_max is null or u.mileage <= p_km_max)
    and (p.fuel_q is null or coalesce(u.fuel,'') ilike '%' || p.fuel_q || '%')
    and (p.transmission_q is null or coalesce(u.transmission,'') ilike '%' || p.transmission_q || '%')
    and (
      p.style_q is null
      or (p.style_q = 'antigos' and u.year is not null and u.year < 2008)
      or (p.style_q = 'turbo' and lower(u.search_text) ~ '(^|[^a-z0-9])turbo([^a-z0-9]|$)|turbina|turbinad')
      or (
        p.style_q = 'rebaixado'
        and (
          case when u.kind = 'gecko' then
            exists (
              select 1
              from public.gecko_listings gx
              where gx.id::text = u.id
                and (
                  gx.ai_manual_rebaixado = true
                  or (
                    gx.ai_manual_rebaixado is null
                    and (
                      gx.ai_rebaixado = true
                      or lower(u.search_text) ~ '(rebaixad|rebaixamento|carro baixo|baixinho|socado|stance|coilover|air ?ride|suspens[aã]o (a ar|de ar|rosca|fixa|regulavel|preparada))'
                    )
                  )
                )
            )
          else lower(u.search_text) ~ '(rebaixad|rebaixamento|carro baixo|baixinho|socado|stance|coilover|air ?ride|suspens[aã]o (a ar|de ar|rosca|fixa|regulavel|preparada))'
          end
        )
      )
    )
),
ordered as (
  select
    f.*,
    row_number() over (
      order by
        f.is_vip desc,
        f.is_featured desc,
        case when (select sort_q from params) = 'price-asc' then f.price end asc nulls last,
        case when (select sort_q from params) = 'price-desc' then f.price end desc nulls last,
        case when (select sort_q from params) = 'year-desc' then f.year end desc nulls last,
        case when (select sort_q from params) = 'km-asc' then f.mileage end asc nulls last,
        case when (select sort_q from params) in ('recent','') then f.sort_date end desc nulls last,
        case when (select sort_q from params) = 'random' then md5(f.id) end asc,
        f.sort_date desc nulls last,
        f.id asc
    ) as rn
  from filtered f
),
paged as (
  select o.*
  from ordered o
  cross join params p
  where o.rn > ((p.page_no - 1) * p.page_size)
    and o.rn <= (p.page_no * p.page_size)
  order by o.rn
)
select jsonb_build_object(
  'total', (select count(*) from filtered),
  'page', (select page_no from params),
  'page_size', (select page_size from params),
  'items', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', pg.id,
          'kind', pg.kind,
          'title', pg.title,
          'price', pg.price,
          'city', pg.city,
          'state', pg.state,
          'cover_url', pg.cover_url,
          'slug', pg.slug,
          'external_url', pg.external_url,
          'brand', pg.brand,
          'model', pg.model,
          'year', pg.year,
          'mileage', pg.mileage,
          'fuel', pg.fuel,
          'transmission', pg.transmission,
          'category_slug', pg.category_slug,
          'is_featured', pg.is_featured,
          'is_vip', pg.is_vip,
          'created_at', pg.sort_date,
          'seller', pg.seller
        ) order by pg.rn
      )
      from paged pg
    ),
    '[]'::jsonb
  )
);
$$;

grant execute on function public.search_public_listings(
  integer, integer, text, text, text, text, text, text,
  numeric, numeric, integer, integer, integer, integer,
  text, text, text, text
) to anon, authenticated;

-- Índices novos somente para o padrão real de listagem pública/ordenação.
-- Não duplicam os índices simples já existentes de state/city/brand/model/price.
create index if not exists listings_public_pagination_idx
  on public.listings (is_vip desc, is_featured desc, created_at desc)
  where status = 'active';

create index if not exists gecko_public_pagination_idx
  on public.gecko_listings (is_vip desc, is_featured desc, imported_at desc)
  where status = 'active';
