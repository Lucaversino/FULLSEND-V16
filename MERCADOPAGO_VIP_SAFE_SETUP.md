# FULLSEND VIP — Mercado Pago (versão segura)

Esta versão foi construída sobre `FULLSEND-SEGURO-PAINEL-USUARIO-VIP.zip`.

## Arquivos modificados/adicionados
- app/vip/page.tsx
- app/perfil/page.tsx (somente reconhecimento do status autorizado)
- components/VipSubscribeButton.tsx
- app/api/payments/vip/subscribe/route.ts
- app/api/payments/webhook/route.ts
- supabase/migrations/011_vip_mercadopago_safe.sql
- app/globals.css (somente classes `vip-payment-*` adicionadas no final)
- .env.example

## NÃO alterado
Home, Header, layout, middleware, Gecko, filtros, Copilot, Admin, Visitantes IA e rotas existentes.

## Passo 1 — Supabase
Execute no SQL Editor:
`supabase/migrations/011_vip_mercadopago_safe.sql`

## Passo 2 — Vercel
Confirme em Production:
- NEXT_PUBLIC_SITE_URL
- MERCADOPAGO_ACCESS_TOKEN
- MERCADOPAGO_WEBHOOK_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## Passo 3 — Mercado Pago
Cadastre a URL Webhook:
`https://SEU-DOMINIO/api/payments/webhook`

Habilite principalmente:
- subscription_preapproval
- subscription_authorized_payment

O webhook valida `x-signature` com HMAC-SHA256 antes de atualizar o Supabase.

## Fluxo
1. Usuário logado abre /vip.
2. Clica ASSINAR FULLSEND VIP.
3. Backend cria uma assinatura mensal R$ 19,90 com status pending.
4. Usuário é redirecionado ao checkout do Mercado Pago.
5. Mercado Pago envia webhook.
6. Backend consulta a assinatura diretamente no Mercado Pago.
7. Se `status=authorized`, `profiles.badge` vira `vip` (admin/premium são preservados).
8. Se a assinatura deixar de ser autorizada e o selo atual for `vip`, o badge anterior é restaurado.
