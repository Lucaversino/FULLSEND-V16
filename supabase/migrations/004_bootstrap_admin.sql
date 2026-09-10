-- IMPORTANTE: troque o e-mail abaixo pelo e-mail da SUA conta FULLSEND.
-- Rode apenas depois de criar sua conta normalmente pelo site.

update public.profiles
set role = 'admin', badge = 'admin', updated_at = now()
where id = (
  select id from auth.users where lower(email) = lower('SEU_EMAIL_AQUI') limit 1
);

-- Conferência:
select p.id, u.email, p.name, p.role, p.badge
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin';
