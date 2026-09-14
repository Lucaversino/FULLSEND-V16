# FULLSEND V17.2.4.2 — Fix definitivo SQL

O erro `42P16: cannot drop columns from view` acontece porque a view
`public.listings_public` já existe com uma estrutura diferente.

A solução definitiva desta versão é:
1. `DROP VIEW IF EXISTS public.listings_public`
2. recriar a view com a estrutura correta
3. reaplicar `GRANT SELECT`

Para corrigir o banco sem rodar a migration inteira, execute:
`supabase/migrations/028_FIX_DEFINITIVO_VIEW.sql`

Depois disso, execute a migration `028_split_garage_classifieds.sql` corrigida
se ainda precisar criar/atualizar a função `search_public_listings`.
