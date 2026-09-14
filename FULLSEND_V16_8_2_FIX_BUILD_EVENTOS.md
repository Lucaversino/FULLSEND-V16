# FULLSEND V16.8.2 — correção de build dos Eventos

Corrigidos os dois erros mostrados pela Vercel:

1. Client Components de eventos não importam mais `lib/events.ts`, que usa `next/headers`.
   Foi criado `lib/events-shared.ts` para constantes e helpers seguros no browser.

2. Corrigido JSX quebrado no menu do painel administrativo.
   A aba EVENTOS agora fica no menu e o componente `AdminEvents` é renderizado na área principal.

A home e os módulos existentes não foram alterados.
