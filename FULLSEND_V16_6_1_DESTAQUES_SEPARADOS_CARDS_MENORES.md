# FULLSEND V16.6.1

Base: FULLSEND V16.6 (paginação real Supabase).

## Correções
1. VIP e DESTAQUE não aparecem mais misturados na grade normal.
   - continuam no carrossel promocional;
   - a consulta paginada normal exclui `is_vip=true` e `is_featured=true`;
   - a contagem e o total de páginas agora consideram somente anúncios normais.

2. Cards normais menores no site.
   - desktop grande: 4 colunas;
   - desktop/tablet: 3 ou 2 colunas;
   - celular: 1 coluna;
   - tipografia, espaçamentos e imagem reduzidos proporcionalmente;
   - cards do carrossel NÃO foram alterados.

## Arquivos alterados
- app/globals.css
- supabase/migrations/017_promoted_separate_from_regular_grid.sql

## Importante
Se a migration 016 já foi executada, rode também a 017 no SQL Editor do Supabase.
