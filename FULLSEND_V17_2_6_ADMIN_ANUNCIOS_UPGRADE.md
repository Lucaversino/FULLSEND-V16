# FULLSEND V17.2.6 — Upgrade Admin > Anúncios

Melhorias:
- paginação no painel: 20, 30 ou 50 anúncios por página;
- padrão 30 por página para reduzir DOM e travamentos;
- seleção individual por checkbox;
- selecionar todos os anúncios visíveis da página;
- exclusão em lote de até 200 anúncios por operação;
- exclusão em lote separa automaticamente FULLSEND e Gecko;
- filtros por fonte e status;
- busca preservada;
- imagens com lazy loading + async decoding;
- `content-visibility:auto` nas linhas para reduzir custo de renderização;
- barra de seleção fixa;
- auditoria da exclusão em lote.

Não requer migration SQL nova.
