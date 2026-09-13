# FULLSEND V16.6 — Paginação real Supabase

## O que foi implementado

- 16 anúncios por página (`ITEMS_PER_PAGE = 16`).
- A página pública não carrega mais 500/1000 anúncios para depois usar `slice()`.
- A consulta principal agora é executada por uma função SQL no Supabase (`search_public_listings`) que:
  - une `listings` + `gecko_listings`;
  - aplica filtros no banco;
  - calcula a contagem real filtrada;
  - ordena VIP/Destaque antes dos normais;
  - devolve somente a faixa solicitada.
- URL usa `?page=N` e preserva os filtros.
- Alterar busca/localização/estilo/filtros volta para a página 1.
- Paginação desktop inteligente e versão compacta no mobile.
- Skeleton durante troca de página.
- Rolagem suave até `#resultados`.
- Tratamento de erro com botão TENTAR NOVAMENTE.
- Cards recebem somente a imagem de capa. As demais fotos/descrição são buscadas ao abrir o anúncio em `/api/listing-detail`.
- Home (`/`) e Explorar (`/explorar`) usam a mesma paginação real.
- Dois índices específicos de paginação foram incluídos na migration.

## IMPORTANTE — antes do deploy

Execute no Supabase SQL Editor:

`supabase/migrations/016_real_public_pagination.sql`

Sem essa migration, a função RPC `search_public_listings` ainda não existe e a listagem exibirá o tratamento de erro em vez de inventar/fazer fallback carregando todos os anúncios.

## Arquivos novos

- `supabase/migrations/016_real_public_pagination.sql`
- `lib/supabase/public-listings.ts`
- `components/PaginatedListings.tsx`
- `components/ListingLoadError.tsx`
- `app/api/listing-detail/route.ts`

## Arquivos alterados

- `app/page.tsx`
- `app/explorar/page.tsx`
- `components/ListingCard.tsx`
- `components/SearchBar.tsx`
- `components/StyleBannerButtons.tsx`
- `app/globals.css`

## Verificações feitas neste pacote

- não existe mais `.limit(1000)` nas páginas públicas `/` e `/explorar`;
- não existe mais paginação pública por `data.slice(...)`;
- tamanho da página está fixado em 15;
- URL `page` é atualizada pelo componente de paginação;
- mudança de localização remove `page`/`pagina`;
- imagens secundárias saíram da carga inicial dos cards;
- ZIP validado após criação.

## Observação sobre o painel administrativo

Esta entrega altera a paginação **pública** (Home/Explorar), que é o caminho crítico de tráfego e o objetivo de 15 anúncios por página. O painel administrativo foi preservado nesta versão para não misturar uma refatoração de backoffice com a mudança da consulta pública e aumentar o risco de quebrar edição, IA, importador e promoções. A paginação administrativa pode ser feita como etapa separada, com endpoints próprios por aba.
