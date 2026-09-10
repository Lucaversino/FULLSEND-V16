-- FULLSEND VIP + Mercado Pago — migration segura e isolada
-- Execute somente DEPOIS das migrations 001–010 da versão estável.

alter table public.profiles
  add column if not exists vip_subscription_status text not null default 'inactive',
  add column if not exists mercadopago_subscription_id text,
  add column if not exists vip_previous_badge text,
  add column if not exists vip_started_at timestamptz,
  add column if not exists vip_next_payment_date timestamptz,
  add column if not exists vip_updated_at timestamptz;

create index if not exists profiles_mp_subscription_idx
  on public.profiles(mercadopago_subscription_id);

create table if not exists public.vip_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mp_subscription_id text not null unique,
  payer_email text,
  status text not null default 'pending',
  amount numeric(12,2) not null default 19.90,
  currency text not null default 'BRL',
  init_point text,
  next_payment_date timestamptz,
  raw_data jsonb,
  mode text not null default 'production',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vip_subscriptions_user_idx
  on public.vip_subscriptions(user_id,updated_at desc);

create index if not exists vip_subscriptions_status_idx
  on public.vip_subscriptions(status);

alter table public.vip_subscriptions enable row level security;

drop policy if exists "vip_subscriptions_owner_read" on public.vip_subscriptions;
create policy "vip_subscriptions_owner_read"
on public.vip_subscriptions for select
to authenticated
using(auth.uid()=user_id);

grant select on public.vip_subscriptions to authenticated;
grant all privileges on table public.vip_subscriptions to service_role;
grant usage,select on all sequences in schema public to service_role;


alter table public.vip_subscriptions
  add column if not exists mode text not null default 'production';

create index if not exists vip_subscriptions_user_mode_idx
  on public.vip_subscriptions(user_id,mode,updated_at desc);
