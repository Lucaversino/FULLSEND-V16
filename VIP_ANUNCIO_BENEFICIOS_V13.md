# FULLSEND V13 — VIP e Destaque para assinantes em dia

Base: FULLSEND V12.

## Regra
Somente usuário com `profiles.vip_subscription_status = authorized` e uma assinatura válida no Mercado Pago pode ativar os benefícios do próprio anúncio.

Ao clicar em ATIVAR VIP ou ATIVAR DESTAQUE, o backend:
1. valida a sessão;
2. confirma que o anúncio pertence ao usuário;
3. confirma o ID da assinatura;
4. consulta a assinatura diretamente no Mercado Pago;
5. só libera se o status real estiver `authorized`;
6. atualiza somente o anúncio daquele usuário.

## Quando pagamento deixa de estar em dia
O webhook remove automaticamente `is_vip` e `is_featured` de todos os anúncios do usuário quando a assinatura sai de `authorized`.
O cancelamento manual também remove os dois benefícios imediatamente.

## Banco
Nenhuma migration nova é necessária. Usa as colunas existentes:
- listings.is_vip
- listings.is_featured
- profiles.vip_subscription_status
- profiles.mercadopago_subscription_id

## Segurança
Badge VIP, badge Admin e anúncio já marcado não liberam o recurso sozinhos. A autorização de pagamento é validada no backend e confirmada com o Mercado Pago.
