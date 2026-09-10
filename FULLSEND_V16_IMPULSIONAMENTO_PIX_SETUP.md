# FULLSEND V16 — IMPULSIONAMENTO POR ANÚNCIO + PIX

Base: V13 estável.

## Novo modelo
- Não existe mais assinatura mensal VIP para novos pagamentos.
- Usuários comuns ficam sem selo.
- Selo ADM aparece somente para perfis com role=admin.
- Cada anúncio FULLSEND pode comprar:
  - DESTAQUE: R$ 4,99 por 7 dias.
  - VIP: R$ 9,99 por 15 dias.
- Pagamento por Pix Mercado Pago.
- O anúncio só é ativado após status `approved` confirmado pelo backend.
- Webhook e consulta automática do status atualizam Supabase.
- Ao vencer, a Home executa limpeza segura e remove o destaque expirado.

## Antes do deploy
No Supabase SQL Editor rode:
`supabase/migrations/014_listing_promotions_pix.sql`

## Variáveis Vercel já usadas
- MERCADOPAGO_ACCESS_TOKEN
- MERCADOPAGO_WEBHOOK_SECRET
- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## Webhook
Mantenha:
`https://fullsendmarket.vercel.app/api/payments/webhook`

E habilite o tópico `payment` no Mercado Pago.

## Segurança
- O usuário não escreve em listing_promotions diretamente.
- O usuário não consegue alterar is_vip/is_featured via Supabase autenticado.
- A rota de criação confere sessão, dono do anúncio, status e preço no servidor.
- O valor não vem do navegador.
- Webhook valida x-signature antes de consultar o pagamento.
- O pagamento é consultado novamente na API do Mercado Pago.

## Assinaturas antigas
A criação de novas assinaturas mensais foi desativada. A rota /vip agora explica o novo sistema. Se ainda existir uma assinatura antiga autorizada, a página oferece o botão antigo de cancelamento para encerrá-la.
