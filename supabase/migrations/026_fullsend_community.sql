-- FULLSEND Comunidade. Aplicar após 025. Transação aditiva; não recria usuários, garagem ou eventos.
begin;
do $$ begin
 if to_regclass('public.profiles') is null or to_regclass('public.listings') is null or to_regclass('public.events') is null or to_regclass('public.user_follows') is null then
 raise exception 'Aplique as migrations existentes até 025 antes da Comunidade.'; end if;
end $$;

-- Impede que edição do próprio perfil contorne moderação ou conceda privilégios.
create or replace function public.community_guard_profile() returns trigger language plpgsql set search_path=public as $$
begin
 if current_user in ('anon','authenticated') and (new.role is distinct from old.role or new.account_status is distinct from old.account_status) then
 raise exception 'Somente o servidor administrativo pode alterar acesso e suspensão.'; end if;
 return new;
end $$;
drop trigger if exists community_guard_profile on public.profiles;
create trigger community_guard_profile before update on public.profiles for each row execute function public.community_guard_profile();

create or replace function public.community_active() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and account_status='active');
$$;
create or replace function public.community_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and role='admin' and account_status='active');
$$;
create or replace function public.community_following(target uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from user_follows where follower_id=auth.uid() and followed_id=target);
$$;
create or replace function public.community_follow_counts(target uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('followers',(select count(*) from user_follows where followed_id=target),'following',(select count(*) from user_follows where follower_id=target));
$$;

-- Reutiliza as interações existentes, respeitando a suspensão também nesses caminhos.
create or replace function public.community_guard_interaction() returns trigger language plpgsql set search_path=public as $$
declare actor uuid;
begin
 actor=coalesce(to_jsonb(new)->>'follower_id',to_jsonb(new)->>'user_id')::uuid;
 if not exists(select 1 from profiles where id=actor and account_status='active') then raise exception 'Conta suspensa para interações.'; end if;
 return new;
end $$;
drop trigger if exists community_guard_follow on public.user_follows;
create trigger community_guard_follow before insert on public.user_follows for each row execute function public.community_guard_interaction();
drop trigger if exists community_guard_attendance on public.event_attendees;
create trigger community_guard_attendance before insert on public.event_attendees for each row execute function public.community_guard_interaction();

create table if not exists public.community_posts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 vehicle_id uuid references public.listings(id) on delete set null,
 event_id uuid references public.events(id) on delete set null,
 post_type text not null default 'Post normal' check(post_type in ('Post normal','Meu projeto','Dúvida','Evento','Encontro','Antes e depois','Upgrade','Foto','Vídeo')),
 content text not null check(char_length(content) between 1 and 5000),
 category text not null default 'Geral' check(char_length(category)<=60),
 city text not null default '' check(char_length(city)<=100), state text not null default '' check(state='' or state ~ '^[A-Z]{2}$'),
 tags text[] not null default '{}' check(cardinality(tags)<=15),
 media jsonb not null default '[]'::jsonb check(jsonb_typeof(media)='array' and jsonb_array_length(media)<=10),
 title text not null default '' check(char_length(title)<=120),
 project_date date, parts text not null default '' check(char_length(parts)<=1500),
 power numeric(8,2) check(power>=0), cost numeric(14,2) check(cost>=0),
 status text not null default 'published' check(status in ('published','hidden','removed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(project_date is null or title<>'')
);
create table if not exists public.community_likes (
 post_id uuid references public.community_posts(id) on delete cascade,
 user_id uuid references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create table if not exists public.community_saved_posts (
 post_id uuid references public.community_posts(id) on delete cascade,
 user_id uuid references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create table if not exists public.community_comments (
 id uuid primary key default gen_random_uuid(),post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 content text not null check(char_length(content) between 1 and 1500),
 status text not null default 'published' check(status in ('published','hidden','removed')),
 created_at timestamptz not null default now()
);
create table if not exists public.community_reports (
 id uuid primary key default gen_random_uuid(), post_id uuid references public.community_posts(id) on delete set null,
 comment_id uuid references public.community_comments(id) on delete set null,
 reported_by uuid references public.profiles(id) on delete set null,
 reported_user_id uuid references public.profiles(id) on delete set null,
 reason text not null check(reason in ('Spam','Conteúdo ofensivo','Golpe','Anúncio irregular','Conteúdo impróprio','Outro')),
 details text not null default '' check(char_length(details)<=1000),
 snapshot text not null default '', status text not null default 'open' check(status in ('open','reviewed','dismissed')),
 created_at timestamptz not null default now()
);
create index if not exists community_feed_idx on public.community_posts(status,created_at desc,id desc);
create index if not exists community_author_idx on public.community_posts(user_id,created_at desc);
create index if not exists community_vehicle_idx on public.community_posts(vehicle_id,project_date desc);
create index if not exists community_location_idx on public.community_posts(state,city,created_at desc);
create index if not exists community_tags_idx on public.community_posts using gin(tags);
create index if not exists community_comments_idx on public.community_comments(post_id,created_at,id);
create index if not exists community_saves_user_idx on public.community_saved_posts(user_id,created_at desc);
create index if not exists community_reports_idx on public.community_reports(status,created_at desc);

create or replace function public.community_guard_post() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='UPDATE' then
  if new.id<>old.id or new.user_id<>old.user_id or new.created_at<>old.created_at then raise exception 'Autoria imutável.'; end if;
  if new.status<>old.status and not public.community_admin() and current_user in ('anon','authenticated') then raise exception 'Moderação restrita.'; end if;
 end if;
 if new.vehicle_id is not null and not exists(select 1 from listings where id=new.vehicle_id and user_id=new.user_id) then raise exception 'Selecione um veículo da sua garagem.'; end if;
 if new.event_id is not null and not exists(select 1 from events where id=new.event_id and (status='published' or created_by=new.user_id)) then raise exception 'Evento indisponível.'; end if;
 if exists(select 1 from jsonb_array_elements(new.media) m where coalesce(m->>'path','') not like new.user_id::text||'/%' or coalesce(m->>'type','') not in ('image/jpeg','image/png','image/webp','video/mp4','video/webm')) then raise exception 'Mídia inválida.'; end if;
 if exists(select 1 from unnest(new.tags) t where t !~ '^[[:alnum:]_]{1,40}$') then raise exception 'Hashtag inválida.'; end if;
 new.updated_at=now(); return new;
end $$;
drop trigger if exists community_guard_post on public.community_posts;
create trigger community_guard_post before insert or update on public.community_posts for each row execute function public.community_guard_post();

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_saved_posts enable row level security;
alter table public.community_reports enable row level security;

drop policy if exists community_read on public.community_posts;
create policy community_read on public.community_posts for select using(status='published' or user_id=auth.uid() or community_admin());
drop policy if exists community_insert on public.community_posts;
create policy community_insert on public.community_posts for insert to authenticated with check(user_id=auth.uid() and status='published' and community_active());
drop policy if exists community_edit on public.community_posts;
create policy community_edit on public.community_posts for update to authenticated using((user_id=auth.uid() and status='published' and community_active()) or community_admin()) with check((user_id=auth.uid() and status='published' and community_active()) or community_admin());
drop policy if exists community_delete on public.community_posts;
create policy community_delete on public.community_posts for delete to authenticated using(user_id=auth.uid() or community_admin());

create or replace function public.community_visible(target uuid) returns boolean language sql stable security invoker set search_path=public as $$ select exists(select 1 from community_posts where id=target and status='published'); $$;

do $$ declare tbl text; begin
 foreach tbl in array array['community_likes','community_saved_posts'] loop
 execute format('drop policy if exists own_read on public.%I',tbl);
 execute format('create policy own_read on public.%I for select using (user_id=auth.uid())',tbl);
 execute format('drop policy if exists own_insert on public.%I',tbl);
 execute format('create policy own_insert on public.%I for insert to authenticated with check(user_id=auth.uid() and community_active() and community_visible(post_id))',tbl);
 execute format('drop policy if exists own_delete on public.%I',tbl);
 execute format('create policy own_delete on public.%I for delete to authenticated using(user_id=auth.uid())',tbl);
 end loop;
end $$;
-- Contagens públicas sem expor quem salvou/curtiu.
create or replace function public.community_like_count(target uuid) returns bigint language sql stable security definer set search_path=public as $$
 select count(*) from community_likes where post_id=target and exists(select 1 from community_posts where id=target and status='published');
$$;
drop policy if exists comments_read on public.community_comments;
create policy comments_read on public.community_comments for select using((status='published' and community_visible(post_id)) or community_admin());
drop policy if exists comments_insert on public.community_comments;
create policy comments_insert on public.community_comments for insert to authenticated with check(user_id=auth.uid() and status='published' and community_active() and community_visible(post_id));
drop policy if exists comments_delete on public.community_comments;
create policy comments_delete on public.community_comments for delete to authenticated using(user_id=auth.uid() or community_admin());
-- Denúncias passam exclusivamente pelo servidor: alvo e evidência não vêm do cliente.
drop policy if exists reports_admin_read on public.community_reports;
create policy reports_admin_read on public.community_reports for select using(community_admin());
grant select,insert,update,delete on public.community_posts to authenticated;
grant select on public.community_posts,public.community_comments,public.community_likes,public.community_saved_posts to anon;
grant select,insert,delete on public.community_comments,public.community_likes,public.community_saved_posts to authenticated;
revoke all on public.community_reports from anon,authenticated;
grant select on public.community_reports to authenticated;
grant all on public.community_posts,public.community_comments,public.community_likes,public.community_saved_posts,public.community_reports to service_role;

-- Bucket privado: conteúdo ocultado deixa de gerar novos links (links assinados duram 5 minutos).
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('community-media','community-media',false,20971520,array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict(id) do nothing;
drop policy if exists community_media_read on storage.objects;
create policy community_media_read on storage.objects for select using(bucket_id='community-media' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.community_posts p where p.status='published' and p.media @> jsonb_build_array(jsonb_build_object('path',name))) or public.community_admin()));
drop policy if exists community_media_insert on storage.objects;
create policy community_media_insert on storage.objects for insert to authenticated with check(bucket_id='community-media' and (storage.foldername(name))[1]=auth.uid()::text and public.community_active());
drop policy if exists community_media_delete on storage.objects;
create policy community_media_delete on storage.objects for delete to authenticated using(bucket_id='community-media' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.community_feed(p_filter text default 'Recentes',p_page integer default 1,p_query text default '',p_author uuid default null,p_vehicle uuid default null,p_tag text default '',p_id uuid default null,p_city text default '',p_state text default '') returns jsonb
language sql stable security invoker set search_path=public as $$
with base as (
 select p.*, public.community_like_count(p.id) likes_count,
 (select count(*) from community_comments c where c.post_id=p.id and c.status='published') comments_count,
 exists(select 1 from community_likes l where l.post_id=p.id and l.user_id=auth.uid()) liked,
 exists(select 1 from community_saved_posts s where s.post_id=p.id and s.user_id=auth.uid()) saved,
 jsonb_build_object('id',u.id,'name',u.name,'avatar_url',u.avatar_url,'city',u.city,'state',u.state) author,
 case when v.id is not null then jsonb_build_object('id',v.id,'title',v.title,'slug',v.slug) end vehicle,
 case when e.id is not null then jsonb_build_object('id',e.id,'title',e.title,'slug',e.slug,'event_date',e.event_date,'event_time',e.event_time,'city',e.city,'state',e.state,'venue',e.venue,'status',e.status) end event,
 case when p_filter='Para você' then (case when community_following(p.user_id) then 2 else 0 end)+(case when p.city<>'' and lower(p.city)=lower(p_city) then 1 else 0 end) else 0 end affinity
 from community_posts p join profiles u on u.id=p.user_id
 left join listings v on v.id=p.vehicle_id and (v.status='active' or v.user_id=auth.uid())
 left join events e on e.id=p.event_id and (e.status='published' or e.created_by=auth.uid())
 where p.status='published'
 and (p_author is null or p.user_id=p_author) and (p_vehicle is null or p.vehicle_id=p_vehicle)
 and (p_id is null or p.id=p_id) and (p_tag='' or lower(p_tag)=any(p.tags))
 and (p_filter<>'Seguindo' or community_following(p.user_id))
 and (p_filter<>'Salvos' or exists(select 1 from community_saved_posts s where s.post_id=p.id and s.user_id=auth.uid()))
 and (p_filter<>'Projetos' or p.vehicle_id is not null)
 and (p_filter<>'Eventos' or p.post_type in ('Evento','Encontro'))
 and (p_filter<>'Dúvidas' or p.post_type='Dúvida')
 and (p_filter<>'Perto de mim' or ((p_city<>'' or p_state<>'') and (p_city='' or lower(p.city)=lower(p_city)) and (p_state='' or p.state=upper(p_state))))
 and (p_query='' or concat_ws(' ',p.content,p.title,p.parts,p.category,array_to_string(p.tags,' '),u.name,v.title) ilike '%'||p_query||'%')
), paged as (
 select * from base order by affinity desc,case when p_filter='Mais curtidos' then likes_count end desc,
 case when p_vehicle is not null then project_date end desc nulls last,created_at desc,id desc
 limit 21 offset ((least(greatest(p_page,1),10000)-1)*20)
)
select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from paged limit 20)x),'[]'::jsonb),'hasMore',(select count(*)>20 from paged));
$$;
revoke all on function public.community_active(),public.community_admin(),public.community_following(uuid),public.community_follow_counts(uuid),public.community_visible(uuid),public.community_like_count(uuid),public.community_feed(text,integer,text,uuid,uuid,text,uuid,text,text) from public;
grant execute on function public.community_active(),public.community_admin(),public.community_following(uuid),public.community_follow_counts(uuid),public.community_visible(uuid),public.community_like_count(uuid),public.community_feed(text,integer,text,uuid,uuid,text,uuid,text,text) to anon,authenticated,service_role;
commit;
