-- Vincula o classificado ao carro pessoal sem mover/excluir o projeto.
begin;
alter table public.listings add column if not exists source_garage_id uuid references public.listings(id) on delete set null;
create unique index if not exists listings_one_open_garage_sale on public.listings(source_garage_id) where source_garage_id is not null and status<>'sold';
create or replace function public.guard_garage_sale_link() returns trigger language plpgsql set search_path=public as $$
begin
 if new.source_garage_id is not null then
  if new.listing_mode<>'classified' or new.category_slug<>'carros' or new.id=new.source_garage_id then raise exception 'Vínculo de venda inválido.'; end if;
  if not exists(select 1 from public.listings g where g.id=new.source_garage_id and g.user_id=new.user_id and g.listing_mode='garage' and g.category_slug='carros') then raise exception 'Selecione um carro da sua própria garagem.'; end if;
 end if;
 return new;
end $$;
drop trigger if exists guard_garage_sale_link on public.listings;
create trigger guard_garage_sale_link before insert or update of source_garage_id,user_id,listing_mode,category_slug on public.listings for each row execute function public.guard_garage_sale_link();
notify pgrst,'reload schema';
commit;
