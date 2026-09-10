# FULLSEND Control Center — instalação

## 1) Banco de dados
No Supabase > SQL Editor, execute nesta ordem:

1. `supabase/migrations/003_admin_vip_profiles.sql`
2. Abra `supabase/migrations/004_bootstrap_admin.sql`, troque `SEU_EMAIL_AQUI` pelo e-mail da sua conta FULLSEND e execute.

A sua conta precisa existir antes do passo 2.

## 2) Vercel
Mantenha estas variáveis configuradas no projeto:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GECKO_API_KEY`

A `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser usada em componente client/browser. Neste projeto ela é usada apenas nas rotas server-side do painel administrativo.

## 3) Painel
Depois do deploy e de entrar com a conta definida como administradora, abra:

`/admin`

O cabeçalho também mostra o botão ADMIN para contas com `role = admin`.

## Recursos adicionados

- Editar/excluir anúncios FULLSEND e Gecko
- Bloquear/vender/desativar anúncios
- Destaque e VIP para qualquer anúncio
- Carrossel público de Destaques & VIP
- Editar e excluir usuários
- Suspender/bloquear contas
- Editar e-mail, nome, cidade, UF e WhatsApp
- Selos: ADM, NOVO, VIP e PREMIUM
- Upload de avatar pelo próprio usuário
- Selo e avatar visíveis nos anúncios FULLSEND
- Auditoria das ações administrativas
- Service Role isolada no servidor
