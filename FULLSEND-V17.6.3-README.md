# FULLSEND V17.6.3 — VERIFIED GLOBAL + EVENTOS INTELIGENTES

Base: V17.6.2 PAGAMENTO EXTERNO enviada pelo usuário.

## Alterações
- Selo verificado ancorado à foto/avatar em perfil, comunidade, busca de pessoas, comentários, mensagens, cards e anúncio.
- Primeiro carrossel de eventos: ordem cronológica, evento mais próximo primeiro.
- Carrossel inferior: ordem aleatória no carregamento + avanço automático.
- Limpeza automática diária de eventos cuja `event_date` já passou.
- Endpoint cron: `/api/cron/cleanup-events`, protegido por `CRON_SECRET`.
- Vercel cron configurado para 03:15 UTC diariamente.

## Banco
Não exige SQL novo. Requer que a migration 031 do selo verificado já esteja aplicada, como na V17.6.2 atual.
