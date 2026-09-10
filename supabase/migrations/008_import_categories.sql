-- FULLSEND - CATEGORIAS DE BUSCA / IMPORTAÇÃO
-- Expande o painel para veículos, som, motores/peças, rodas/pneus,
-- suspensão, acessórios e performance/turbo.

alter table public.import_search_jobs
  add column if not exists search_category text not null default 'vehicles';

alter table public.import_search_logs
  add column if not exists search_category text;

alter table public.gecko_listings
  add column if not exists import_search_category text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'import_search_jobs_search_category_check'
  ) then
    alter table public.import_search_jobs
      add constraint import_search_jobs_search_category_check
      check (search_category in (
        'vehicles',
        'audio',
        'engine_parts',
        'wheels_tires',
        'suspension',
        'accessories',
        'performance'
      ));
  end if;
end $$;

create index if not exists import_search_jobs_category_idx
  on public.import_search_jobs(search_category, enabled);

create index if not exists gecko_listings_import_search_category_idx
  on public.gecko_listings(import_search_category, imported_at desc);

comment on column public.import_search_jobs.search_category is
  'Categoria configurada pelo administrador para direcionar a pesquisa automática.';

comment on column public.gecko_listings.import_search_category is
  'Categoria da pesquisa FULLSEND que originou/atualizou o anúncio.';
