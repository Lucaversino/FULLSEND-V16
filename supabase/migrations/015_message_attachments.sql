-- FULLSEND V16.5 — ANEXOS PRIVADOS NO CHAT
alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='messages_attachments_is_array'
      and conrelid='public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_attachments_is_array
      check (jsonb_typeof(attachments)='array');
  end if;
end $$;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'message-attachments','message-attachments',false,8388608,
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'application/pdf','text/plain','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public=false,
  file_size_limit=8388608,
  allowed_mime_types=excluded.allowed_mime_types;
