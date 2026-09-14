# FULLSEND V17.1.2 — Eventos no painel do usuário

No `/perfil`, o usuário agora vê todos os eventos criados por ele.

Incluído:
- status do evento;
- imagem, título, categoria, data e cidade/UF;
- botão EDITAR;
- botão EXCLUIR;
- botão CRIAR EVENTO;
- qualquer edição volta o evento para PENDENTE para revisão;
- todos os eventos continuam no Admin > Eventos;
- segurança por `created_by = auth.uid()`.

Execute no Supabase:
`supabase/migrations/025_user_event_manage_policies.sql`
