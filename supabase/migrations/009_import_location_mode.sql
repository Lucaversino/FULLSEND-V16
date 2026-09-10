-- FULLSEND - MODOS DE LOCALIZAÇÃO PARA BUSCAS AUTOMÁTICAS

alter table public.import_search_jobs
  add column if not exists location_mode text not null default 'exact';

alter table public.import_search_logs
  add column if not exists location_mode text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='import_search_jobs_location_mode_check'
  ) then
    alter table public.import_search_jobs
      add constraint import_search_jobs_location_mode_check
      check (location_mode in ('exact','region','state','any'));
  end if;
end $$;

comment on column public.import_search_jobs.location_mode is
  'exact=cidade exata; region=região próxima; state=todo estado; any=sem filtro de localização.';
