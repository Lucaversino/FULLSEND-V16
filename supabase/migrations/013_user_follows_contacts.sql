-- FULLSEND V11 — SEGUIR USUÁRIOS / CONTATOS
-- Execute depois da migration 012.

create table if not exists public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint user_follows_not_self check (follower_id <> followed_id)
);

create index if not exists user_follows_follower_idx
  on public.user_follows(follower_id, created_at desc);

create index if not exists user_follows_followed_idx
  on public.user_follows(followed_id, created_at desc);

alter table public.user_follows enable row level security;

-- O frontend não acessa esta tabela diretamente.
-- As ações passam pelo backend autenticado.
revoke all on public.user_follows from anon, authenticated;

grant all privileges on table public.user_follows to service_role;
grant usage, select on all sequences in schema public to service_role;
