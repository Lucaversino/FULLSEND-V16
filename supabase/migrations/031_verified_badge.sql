begin;
alter table public.profiles add column if not exists verified_paid boolean not null default false;
alter table public.profiles add column if not exists verified_override boolean;
alter table public.profiles add column if not exists is_verified boolean generated always as (coalesce(verified_override,verified_paid)) stored;
create or replace function public.guard_verified_fields() returns trigger language plpgsql as $$
begin
 if current_user in ('anon','authenticated') then
  if TG_OP='INSERT' then new.verified_paid:=false;new.verified_override:=null;
  elsif new.verified_paid is distinct from old.verified_paid or new.verified_override is distinct from old.verified_override then raise exception 'Selo restrito ao sistema e administração.';
  end if;
 end if;
 return new;
end $$;
drop trigger if exists guard_verified_fields on public.profiles;
create trigger guard_verified_fields before insert or update on public.profiles for each row execute function public.guard_verified_fields();
create table if not exists public.verification_payments(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 amount numeric(10,2) not null default 7.99 check(amount=7.99),status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled','refunded','charged_back')),
 mp_payment_id text unique,qr_code text,qr_code_base64 text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index if not exists verification_one_pending on public.verification_payments(user_id) where status='pending';
alter table public.verification_payments enable row level security;
revoke all on public.verification_payments from anon,authenticated;
grant all on public.verification_payments to service_role;
create or replace function public.sync_verified_payment(p_order uuid,p_payment text,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare r public.verification_payments;
begin
 select * into r from public.verification_payments where id=p_order for update;
 if not found then raise exception 'Pagamento não encontrado';end if;
 if r.mp_payment_id is not null and r.mp_payment_id<>p_payment then raise exception 'Pagamento divergente';end if;
 perform 1 from public.profiles where id=r.user_id for update;
 if r.status in ('refunded','charged_back') then return;end if;
 if r.status='approved' and p_status in ('pending','rejected','cancelled') then return;end if;
 update public.verification_payments set status=p_status,mp_payment_id=p_payment,updated_at=now() where id=r.id;
 update public.profiles set verified_paid=exists(select 1 from public.verification_payments where user_id=r.user_id and status='approved') where id=r.user_id;
end $$;
revoke all on function public.sync_verified_payment(uuid,text,text) from public,anon,authenticated;
grant execute on function public.sync_verified_payment(uuid,text,text) to service_role;
notify pgrst,'reload schema';
commit;
