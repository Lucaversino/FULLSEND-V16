# FULLSEND V17.2.5.1 — Fix build Footer

Erro corrigido:
`Expected ',', got 'className'` em `components/Footer.tsx`.

Causa:
O componente retornava dois elementos JSX irmãos (`section` e `footer`)
sem um elemento pai.

Correção:
Os dois elementos foram envolvidos por um React Fragment (`<>...</>`).

Nenhuma outra funcionalidade foi alterada.
