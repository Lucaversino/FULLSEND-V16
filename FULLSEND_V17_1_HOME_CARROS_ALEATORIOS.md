# FULLSEND V17.1 — Home com carros aleatórios

## Mudança
A lista normal de anúncios da página inicial agora usa **ALEATÓRIO** como ordenação padrão.

- Cada novo carregamento de `/` gera uma seed nova.
- O banco sorteia anúncios considerando **toda a base filtrada**, não apenas os 16 primeiros.
- Os 16 cards continuam sendo paginados normalmente.
- Ao ir para página 2, 3 etc., a seed é preservada para não embaralhar novamente no meio da navegação.
- Ao atualizar a home sem filtros/seed, uma nova seleção de carros é exibida.
- Ordenações manuais continuam funcionando: recentes, preço, ano e km.
- VIP/Destaque continuam separados da grade normal.

## Supabase
Execute:
`supabase/migrations/024_home_random_listings_seed.sql`

A migration mantém a mesma assinatura da RPC `search_public_listings`.
