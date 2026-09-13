# FULLSEND V16.7 — Formulário profissional de anúncio

Base: V16.6.2.

Implementado:
- formulário profissional por seções;
- categoria sincronizada com o marketplace;
- para CARROS: estilo REBAIXADO / TURBO / ANTIGO (múltipla seleção);
- marca, modelo, ano, quilometragem, combustível, câmbio, cor, carroceria, motor, potência, portas, estado geral e equipamentos/modificações;
- até 15 fotos/vídeos com prévia e capa;
- gravação real dos campos na tabela `listings`;
- filtros públicos usam os mesmos campos para anúncios FULLSEND;
- filtros de estilo continuam compatíveis com anúncios Gecko/importados por heurística/IA;
- cards e modal passam a receber ano/km/combustível/câmbio também para anúncios nativos;
- editor do usuário atualizado para editar a ficha técnica;
- página completa do anúncio mostra ficha básica do veículo.

Migration obrigatória:
`supabase/migrations/019_professional_vehicle_listing_fields.sql`

Arquivos principais alterados:
- components/AnnounceForm.tsx
- components/UserListingActions.tsx
- lib/listings.ts
- lib/supabase/public-listings.ts
- app/page.tsx
- app/perfil/page.tsx
- app/api/listing-detail/route.ts
- app/anuncio/[slug]/page.tsx
- app/globals.css
- supabase/migrations/019_professional_vehicle_listing_fields.sql
