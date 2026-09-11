# FULLSEND V16.5.11 — Carrossel com motor RAF contínuo

A V16.5.10 usava `scrollLeft` para mover o carrossel. Esta versão troca o motor por
`requestAnimationFrame` + `transform: translate3d()`, que é mais estável para animação contínua.

Comportamento:
- carrossel roda automaticamente o tempo todo;
- clicar nas setas apenas reposiciona e o movimento automático continua imediatamente;
- abrir/fechar um anúncio não pausa o carrossel;
- clique normal no card continua abrindo o anúncio;
- loop infinito preservado;
- movimento acelerado para 42 px/s para ficar visualmente perceptível.

Arquivos alterados:
- components/FeaturedShowcase.tsx
- app/globals.css
