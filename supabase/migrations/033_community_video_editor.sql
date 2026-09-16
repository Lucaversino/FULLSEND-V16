-- FULLSEND V17.7.1 - FULLSEND Video Studio
-- Mantem media em JSONB, sem remover ou renomear colunas existentes.
-- Libera thumbnails vinculadas ao post e reforca validacao de posterPath.

create or replace function public.community_guard_post() returns trigger
language plpgsql set search_path=public as $$
begin
 if TG_OP='UPDATE' then
  if new.id<>old.id or new.user_id<>old.user_id or new.created_at<>old.created_at then raise exception 'Autoria imutável.'; end if;
  if new.status<>old.status and not public.community_admin() and current_user in ('anon','authenticated') then raise exception 'Moderação restrita.'; end if;
 end if;
 if new.vehicle_id is not null and not exists(select 1 from listings where id=new.vehicle_id and user_id=new.user_id) then raise exception 'Selecione um veículo da sua garagem.'; end if;
 if new.event_id is not null and not exists(select 1 from events where id=new.event_id and (status='published' or created_by=new.user_id)) then raise exception 'Evento indisponível.'; end if;
 if exists(
  select 1 from jsonb_array_elements(new.media) m
  where coalesce(m->>'path','') not like new.user_id::text||'/%'
     or coalesce(m->>'type','') not in ('image/jpeg','image/png','image/webp','video/mp4','video/webm')
     or (m ? 'posterPath' and coalesce(m->>'posterPath','') not like new.user_id::text||'/%')
 ) then raise exception 'Mídia inválida.'; end if;
 if exists(select 1 from unnest(new.tags) t where t !~ '^[[:alnum:]_]{1,40}$') then raise exception 'Hashtag inválida.'; end if;
 new.updated_at=now(); return new;
end $$;

drop policy if exists community_media_read on storage.objects;
create policy community_media_read on storage.objects for select using(
 bucket_id='community-media' and (
  (storage.foldername(name))[1]=auth.uid()::text
  or exists(
   select 1 from public.community_posts p
   where p.status='published'
     and (
      p.media @> jsonb_build_array(jsonb_build_object('path',name))
      or exists(select 1 from jsonb_array_elements(p.media) m where m->>'posterPath'=name)
     )
  )
  or public.community_admin()
 )
);
