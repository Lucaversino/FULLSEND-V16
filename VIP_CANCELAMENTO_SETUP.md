# FULLSEND V9 — CANCELAMENTO VIP

Adicionado:
- POST /api/payments/vip/cancel
- components/VipCancelButton.tsx
- cancelamento no /perfil para VIP ativo
- cancelamento no /vip para VIP ativo

Fluxo:
1. usuário logado confirma cancelamento;
2. backend encontra a assinatura do próprio usuário;
3. atualiza o preapproval no Mercado Pago para cancelled;
4. sincroniza vip_subscriptions;
5. sincroniza profiles;
6. se o badge atual for vip, restaura o badge anterior.

Nenhuma migration nova obrigatória.
Usa a estrutura VIP já criada pela migration 011.
