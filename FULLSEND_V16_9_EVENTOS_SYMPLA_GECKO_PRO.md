# FULLSEND V16.9 — Eventos Sympla via GeckoAPI

## Fonte principal
O importador de eventos agora usa a GeckoAPI que já existe no FULLSEND:
- `GECKO_API_KEY`
- target: `sympla.com.br`
- type: `plp`

Não requer `SYMPLA_API_TOKEN` nem `TICKETMASTER_API_KEY`.

## Admin > Eventos
- busca livre (ex.: `encontro de carros`);
- 1 a 5 páginas;
- publicar automaticamente ou enviar para pendentes;
- botão `IMPORTAR BUSCA`;
- botão `PACOTE AUTOMOTIVO` com 8 buscas brasileiras;
- resultados: encontrados, importados, atualizados, existentes, recebidos Gecko e créditos estimados;
- todos os eventos importados e enviados por usuários aparecem no painel;
- editar, aprovar, rejeitar, destacar, excluir individualmente e excluir todos.

## Home
- carrossel pequeno de eventos logo abaixo de Destaque/VIP;
- segundo carrossel de eventos abaixo dos anúncios;
- botão lateral com calendário `EVENTOS`.

## Público
- `/eventos`: página completa de eventos;
- `/eventos/[slug]`: detalhes;
- `/eventos/adicionar`: usuário logado cria evento;
- eventos enviados por usuários entram como `pending`.

## Banco
A estrutura usa a migration 020 já existente. Nenhuma migration nova é necessária para esta versão.
