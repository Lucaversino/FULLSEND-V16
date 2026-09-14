# FULLSEND V16.8.3 — Importador de eventos melhorado

Base: V16.8.2.

O painel estava mostrando 0 eventos encontrados.
A integração estava funcional, mas a busca estava restrita ao `countryCode=BR`
e a Ticketmaster frequentemente não possui cobertura automotiva suficiente no Brasil.

Mudanças:
- mantém o Brasil como primeira prioridade;
- amplia termos automotivos;
- consulta até 100 resultados por termo;
- se o Brasil retornar zero, executa fallback global;
- no fallback, filtra novamente por termos automotivos para evitar eventos irrelevantes;
- mantém deduplicação por `external_id`;
- painel mostra diagnóstico `Brasil bruto` e `Fallback global`;
- API Key continua somente no servidor.

Arquivos alterados:
- lib/events/providers/ticketmaster.ts
- lib/events/importer.ts
- components/admin/AdminEvents.tsx

Nenhuma alteração na home, anúncios, carrossel, login ou pagamentos.
