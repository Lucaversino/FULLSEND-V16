-- FULLSEND V17.6.0 — capa personalizável do perfil público
alter table public.profiles add column if not exists profile_cover_url text;
