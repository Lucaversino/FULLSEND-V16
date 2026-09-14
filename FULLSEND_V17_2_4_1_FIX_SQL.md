# FULLSEND V17.2.4.1 — Correção SQL

Erro corrigido:
`ERROR: 42P16: cannot drop columns from view`

A migration 028 tentava recriar `public.listings_public` com menos colunas do que
a view já existente. PostgreSQL não permite remover colunas usando
`CREATE OR REPLACE VIEW`.

A correção mantém `is_featured` e `is_vip` e preserva exatamente a estrutura
anterior da view, alterando somente o filtro de `listing_mode`.

Para quem já tentou a migration anterior, pode executar:
`supabase/migrations/028_FIX_ERRO_VIEW_SQL_EDITOR.sql`

Depois execute o restante da migration 028 a partir da função
`search_public_listings`, ou simplesmente rode a migration 028 corrigida inteira.
