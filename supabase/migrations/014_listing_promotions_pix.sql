-- FULLSEND V16 — impulsionamento por anúncio via PIX Mercado Pago
-- Baseado na V13 estável. Substitui o conceito de assinatura VIP por promoção do anúncio.

create table if not exists public.listing_promotions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  promotion_type text not null check (promotion_type in ('featured','vip')),
  amount numeric(10,2) not null check (amount >= 0),
  duration_days integer not null check (duration_days > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','refunded','expired','failed')),
  mp_payment_id text unique,
  mp_status text,
  pix_qr_code text,
  pix_qr_code_base64 text,
  ticket_url text,
  approved_at timestamptz,
  started_at timestamptz,
  expires_at timestamptz,
  source text not null default 'mercadopago' check (source in ('mercadopago','admin')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_promotions_listing_idx on public.listing_promotions(listing_id, created_at desc);
create index if not exists listing_promotions_user_idx on public.listing_promotions(user_id, created_at desc);
create index if not exists listing_promotions_status_idx on public.listing_promotions(status, expires_at);
create index if not exists listing_promotions_payment_idx on public.listing_promotions(mp_payment_id);

alter table public.listing_promotions enable row level security;
revoke all on public.listing_promotions from anon, authenticated;
grant all privileges on table public.listing_promotions to service_role;

-- Todos os usuários comuns ficam sem selo. Somente contas administrativas mantêm ADM.
update public.profiles set badge='none' where coalesce(role,'user') <> 'admin';
update public.profiles set badge='admin' where role='admin';

-- Novas contas entram sem selo.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,name,city,state,whatsapp,badge)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'name',''),
    new.raw_user_meta_data->>'city',
    upper(new.raw_user_meta_data->>'state'),
    new.raw_user_meta_data->>'whatsapp',
    'none'
  ) on conflict(id) do nothing;
  return new;
end;$$;

-- Usuário comum continua podendo editar seu anúncio, mas não pode ativar VIP/Destaque de graça.
create or replace function public.fullsend_lock_promotion_flags() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' then
      new.is_vip := false;
      new.is_featured := false;
    else
      new.is_vip := old.is_vip;
      new.is_featured := old.is_featured;
    end if;
  end if;
  return new;
end;$$;

drop trigger if exists trg_fullsend_lock_promotion_flags on public.listings;
create trigger trg_fullsend_lock_promotion_flags
before insert or update on public.listings
for each row execute function public.fullsend_lock_promotion_flags();
