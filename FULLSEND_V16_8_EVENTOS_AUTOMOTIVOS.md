# FULLSEND V16.8 — Eventos Automotivos

Módulo independente criado sobre a V16.7.

## Proteção da home
`app/page.tsx` não foi alterado.
Também não foram alterados Header, filtros de anúncios, carrossel de anúncios,
autenticação, Mercado Pago ou rotas existentes.

## Rotas novas
- `/eventos`
- `/eventos/[slug]`
- `/eventos/adicionar`
- `/api/events/import`
- `/api/events/attendance`
- `/api/admin/events`
- `/api/admin/events/upload`

## Supabase
Execute:
`supabase/migrations/020_events_automotive.sql`

A migration cria:
- `events`
- `event_attendees`
- bucket `event-images`
- RLS
- índices
- RPC `search_events` com paginação real de 12 registros e filtro por distância.

## Ticketmaster
Na Vercel:
- `TICKETMASTER_API_KEY`
- opcional: `EVENTS_IMPORT_STATUS=published` ou `pending`
- opcional: `CRON_SECRET` para execução automatizada segura

A API Key nunca é enviada ao navegador.

## Admin
A seção EVENTOS foi adicionada no painel administrativo existente.
Inclui CRUD, aprovação/rejeição, destaque, upload e importação Ticketmaster.

## Usuários
Usuários logados podem sugerir eventos em `/eventos/adicionar`.
Entram com `status=pending` e precisam de aprovação.

## Presença
`event_attendees` impede duplicação por `(event_id,user_id)`.
O botão EU VOU alterna confirmação e mostra contagem.

## SEO
Somente o módulo de eventos recebe metadata/canonical/Open Graph próprios.
Detalhes incluem JSON-LD Schema.org Event.
