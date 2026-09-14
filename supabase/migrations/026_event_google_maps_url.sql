alter table public.events
  add column if not exists google_maps_url text;

comment on column public.events.google_maps_url is
  'Link opcional do Google Maps informado pelo organizador do evento.';
