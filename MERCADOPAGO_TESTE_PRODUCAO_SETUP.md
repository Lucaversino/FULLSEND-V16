# FULLSEND V8 — Mercado Pago com modo TESTE e PRODUÇÃO

## Modo de teste
Na Vercel (Production/Preview conforme seu deploy):
- MERCADOPAGO_MODE=test
- MERCADOPAGO_ACCESS_TOKEN=<token de teste>
- MERCADOPAGO_TEST_PAYER_EMAIL=<e-mail da conta COMPRADOR de teste>
- MERCADOPAGO_WEBHOOK_SECRET=<secret do webhook>
- NEXT_PUBLIC_SITE_URL=https://fullsendmarket.vercel.app

Importante:
O usuário pode continuar logado no FULLSEND com o e-mail normal.
Quando MERCADOPAGO_MODE=test, o backend NÃO envia o e-mail real do usuário ao Mercado Pago.
Ele usa MERCADOPAGO_TEST_PAYER_EMAIL.

Isso evita o erro:
"Both payer and collector must be real or test users"

## Modo de produção
Troque para:
- MERCADOPAGO_MODE=production
- MERCADOPAGO_ACCESS_TOKEN=<token de produção>

No modo production, o backend usa o e-mail real da conta FULLSEND.

## Diagnóstico
Abra:
`/api/payments/status`

Exemplo em teste:
{
  "ok": true,
  "mode": "test",
  "tokenConfigured": true,
  "webhookSecretConfigured": true,
  "testPayerConfigured": true
}

## Supabase
Execute novamente a migration 011.
Ela é idempotente e adiciona a coluna `mode` se ainda não existir.
