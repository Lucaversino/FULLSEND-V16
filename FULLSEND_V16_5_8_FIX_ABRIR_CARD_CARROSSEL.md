# FULLSEND V16.5.8 — abertura dos cards do carrossel corrigida

O problema estava na disputa entre os eventos de arrastar do carrossel e os eventos de clique do card.

Agora:
- desktop: dois cliques rápidos no mesmo card abrem o modal;
- celular/tablet: um toque abre o card;
- arrastar continua funcionando;
- movimentos pequenos do mouse não são tratados como arraste;
- removido o bloqueio de click capture do carrossel;
- o card detecta diretamente pointer down/move/up, sem depender de dblclick nativo.

Arquivos alterados:
- components/ListingCard.tsx
- components/FeaturedShowcase.tsx
- app/globals.css
