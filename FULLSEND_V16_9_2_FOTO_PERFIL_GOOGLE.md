# FULLSEND V16.9.2 — Foto de perfil para contas Google

Correções:
- usuário pode trocar foto mesmo que a conta tenha sido criada pelo Google;
- upload é feito por rota segura no backend;
- máximo 5 MB; JPG, PNG e WEBP;
- preview da foto antes de salvar;
- após salvar, painel atualiza automaticamente;
- login Google não sobrescreve mais a foto personalizada;
- foto Google continua sendo usada como imagem inicial quando o perfil ainda não tem avatar;
- migration 022 repara bucket e políticas do Storage.

Execute no Supabase:
`supabase/migrations/022_profile_avatar_google_fix.sql`
