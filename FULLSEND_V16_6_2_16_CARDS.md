# FULLSEND V16.6.2 — 16 cards por página

Base: V16.6.1.

Alteração:
- listagem pública agora usa 16 anúncios por página;
- paginação real no Supabase preservada;
- VIP/Destaque continuam separados da grade normal;
- cards menores preservados;
- Home e Explorar usam o mesmo `ITEMS_PER_PAGE = 16`.

Migration para banco já atualizado:
- `supabase/migrations/018_page_size_16.sql`

Arquivos de lógica alterados:
- `lib/supabase/public-listings.ts`
- defaults das funções SQL mantidos alinhados em 16.
