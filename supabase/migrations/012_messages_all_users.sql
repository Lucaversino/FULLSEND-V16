-- FULLSEND V10 — MENSAGENS PARA TODOS OS USUÁRIOS
-- Execute depois da migration 011.
-- O acesso às mensagens ocorre somente pelo backend autenticado do FULLSEND.

create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  starter_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_not_self check (starter_id <> recipient_id)
);

create index if not exists conversations_starter_idx
  on public.conversations(starter_id, last_message_at desc);

create index if not exists conversations_recipient_idx
  on public.conversations(recipient_id, last_message_at desc);

create index if not exists conversations_listing_idx
  on public.conversations(listing_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_body_length check (
    char_length(btrim(body)) between 1 and 2000
  )
);

create index if not exists messages_conversation_idx
  on public.messages(conversation_id, created_at asc);

create index if not exists messages_unread_idx
  on public.messages(conversation_id, read_at)
  where read_at is null;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Sem policies para anon/authenticated: acesso direto do navegador fica bloqueado.
-- O backend valida a sessão e usa service_role somente após confirmar que
-- o usuário participa da conversa.

revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;

grant all privileges on table public.conversations to service_role;
grant all privileges on table public.messages to service_role;
grant usage, select on all sequences in schema public to service_role;
