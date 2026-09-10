# FULLSEND — rebuild seguro do painel

Base utilizada: fullsend-classificados-admin-visitantes-ia(1).zip

## Mudanças intencionais
- app/perfil/page.tsx
- app/vip/page.tsx (nova)
- components/ProfileOverview.tsx (novo)
- components/UserListingActions.tsx (novo)
- app/globals.css: somente novas classes no final do arquivo

## Arquivos críticos NÃO alterados
- app/layout.tsx
- app/page.tsx
- components/Header.tsx
- components/MobileAnnounceButton.tsx
- middleware.ts
- lib/supabase/server.ts
- vercel.json
- todas as rotas/admin e visitantes IA

## Banco
Nenhuma migration nova é obrigatória nesta versão.
O painel usa apenas colunas já existentes nas migrations 001–005.

## VIP
Nesta versão segura o VIP é visual e reconhece `profiles.badge` = vip/premium/admin
ou anúncios já marcados como `is_vip`.
O gateway de pagamento não foi conectado nesta etapa para não alterar a home,
layout, middleware ou banco que já estavam funcionando.
