-- FULLSEND - IA DE ESTILO AUTOMOTIVO
-- Classificação visual + textual para o filtro REBAIXADOS.

alter table public.gecko_listings
  add column if not exists ai_rebaixado boolean,
  add column if not exists ai_roda_grande boolean,
  add column if not exists ai_stance boolean,
  add column if not exists ai_style_score integer,
  add column if not exists ai_confidence numeric(5,4),
  add column if not exists ai_style_source text,
  add column if not exists ai_reason text,
  add column if not exists ai_tags jsonb default '{}'::jsonb,
  add column if not exists ai_analyzed_at timestamptz,
  add column if not exists ai_analysis_version text,
  add column if not exists ai_manual_rebaixado boolean;

create index if not exists gecko_listings_ai_rebaixado_idx
  on public.gecko_listings(status, ai_rebaixado)
  where status = 'active';

create index if not exists gecko_listings_ai_pending_idx
  on public.gecko_listings(imported_at desc)
  where status = 'active' and ai_analyzed_at is null;

comment on column public.gecko_listings.ai_manual_rebaixado is
  'Override manual do administrador: true=forçar rebaixado, false=forçar não rebaixado, null=usar IA.';
