-- FULLSEND V17.1.2
-- Usuário pode editar e excluir somente eventos criados por ele.

drop policy if exists "events_owner_update" on public.events;
drop policy if exists "events_owner_delete" on public.events;

create policy "events_owner_update"
on public.events
for update
to authenticated
using(created_by=auth.uid())
with check(created_by=auth.uid());

create policy "events_owner_delete"
on public.events
for delete
to authenticated
using(created_by=auth.uid());

grant update,delete on public.events to authenticated;
