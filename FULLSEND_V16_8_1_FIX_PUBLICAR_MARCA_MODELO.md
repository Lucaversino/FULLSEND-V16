# FULLSEND V16.8.1 — Publicação + Marca/Modelo selecionar

Correções sobre a V16.8:

1. Corrigido `permission denied for table listings`.
   - Nova rota autenticada `POST /api/listings/create`.
   - O usuário é validado pela sessão existente.
   - A Service Role é usada somente no servidor.
   - `user_id`, `source`, `status`, VIP e DESTAQUE são controlados no servidor.
   - Migration 021 também repara GRANT/RLS da tabela `listings`.

2. Marca e modelo agora são campos de seleção.
   - Marca selecionável.
   - Modelo depende da marca selecionada.
   - Catálogo automotivo local, sem API externa e sem afetar performance.
   - Editor do usuário também recebeu os selects para manter consistência.

Execute no Supabase:
`supabase/migrations/021_listings_publish_permissions_repair.sql`

A migration 019 continua necessária porque contém os campos técnicos do veículo.
