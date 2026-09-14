# FULLSEND V17.1.1 — Correção do build

Erro corrigido:
`Cannot find name 'Zap'`

Causa:
O componente AdminDashboard passou a usar `<Zap />` no botão de ajuste de XP,
mas o ícone não havia sido importado do pacote `lucide-react`.

Correção:
`Zap` foi adicionado ao import existente de `lucide-react`.

Nenhuma outra função foi alterada.
