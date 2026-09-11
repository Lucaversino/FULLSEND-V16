# FULLSEND V16.5.1 — Correção do build

Correção pontual em:
- app/mensagens/page.tsx

Erro corrigido:
`import MessagesHub ... \nimport { signAttachments ...`

O `\n` literal foi substituído por uma quebra de linha real entre os imports.

Nenhuma outra lógica do projeto foi alterada.
