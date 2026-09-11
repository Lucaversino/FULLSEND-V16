# FULLSEND V16.5.6 — Duplo clique corrigido no carrossel

Base: V16.5.5.

Correção:
- o duplo clique agora está ligado diretamente ao componente ListingCard;
- no carrossel, clique simples não abre;
- duplo clique abre o modal do anúncio;
- fora do carrossel, os cards continuam abrindo com um clique;
- arrastar o carrossel continua funcionando;
- evita depender de card.click() programático, que estava sendo bloqueado pelo próprio evento do carrossel.

Arquivos alterados:
- components/ListingCard.tsx
- components/FeaturedShowcase.tsx

Todo o restante da V16.5.5 foi preservado, inclusive miniaturas no Admin.
