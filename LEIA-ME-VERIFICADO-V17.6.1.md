FULLSEND V17.6.1 — Selo Verificado e selos compactos

INSTALAÇÃO
1. Execute supabase/migrations/031_verified_badge.sql no SQL Editor do Supabase. A versão anterior usa também o SQL 030 para capa/cor do perfil.
2. Publique os arquivos deste ZIP na Vercel.
3. Mantenha MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_WEBHOOK_SECRET e NEXT_PUBLIC_SITE_URL corretos no ambiente da Vercel. O webhook existente /api/payments/webhook deve receber eventos payment.
4. Confira uma transação no ambiente configurado após o deploy. Nenhum pagamento real foi criado durante o desenvolvimento.

COMPRA
No painel do usuário, a seção Selo Verificado oferece compra por Pix a R$ 7,99, pagamento único, sem renovação automática e sem prazo de expiração. O selo visual não equivale a validação documental nem garantia de uma negociação.
O sistema reaproveita pedidos pendentes e a mesma chave de idempotência. O servidor consulta o Mercado Pago e confere valor, moeda BRL e vínculo com o pedido antes da ativação. O webhook exige a assinatura já configurada no projeto. Reembolso/chargeback removem a concessão paga, preservando a decisão manual do administrador.

PAINEL ADMINISTRATIVO > USUÁRIOS > SELO VERIFICADO
Automático pelo pagamento: segue a confirmação de compra.
Conceder manualmente: ativa sem pagamento.
Remover / bloquear selo: desativa e bloqueia novas compras até retornar a Automático.
Clique em salvar usuário para aplicar. O painel identifica contas com pagamento aprovado. Alterações ficam no registro de auditoria existente.
O selo aparece no perfil público e no painel do usuário, independente do XP e do VIP.

VISUAL
Nova arte ADM em formato de letras, pequena junto à foto do perfil.
Selo de XP menor e à direita do nome. Mantidas as demais funções e artes.

VALIDAÇÃO
Build/TypeScript aprovados. Testes locais verificam ativação, notificações repetidas, prioridade manual, reembolso, rejeição de atualização direta por usuário e proteção da função de pagamento. O fluxo completo com Pix real deve ser conferido depois do deploy.
