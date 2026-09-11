# FULLSEND V16.5.7 — Dois cliques funcional no carrossel

Correção feita sobre a V16.5.6.

Problema encontrado:
- o carrossel usava `setPointerCapture()` no viewport;
- isso redirecionava os eventos do mouse para o carrossel e o card não recebia corretamente o duplo clique.

Correção:
- removido o pointer capture do viewport;
- o próprio ListingCard agora detecta dois cliques em até 500 ms;
- primeiro clique não abre;
- segundo clique abre o modal;
- arrastar o carrossel continua funcionando;
- cards fora do carrossel continuam abrindo com um clique.

Arquivos alterados:
- components/ListingCard.tsx
- components/FeaturedShowcase.tsx
