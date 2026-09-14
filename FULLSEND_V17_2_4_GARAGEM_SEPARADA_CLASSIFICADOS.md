# FULLSEND V17.2.4 — Minha Garagem separada dos Classificados

## Conceito
O painel agora possui duas áreas diferentes:

### CLASSIFICADOS
Para carros e itens que o usuário está vendendo.
- aparecem na home e buscas;
- podem ser ativados/pausados;
- podem ser editados/excluídos;
- podem receber Destaque/VIP;
- possuem preço e contato.

### MINHA GARAGEM
Para carros que realmente pertencem ao usuário e projetos pessoais.
- não aparecem nos classificados;
- aparecem no perfil público da Comunidade;
- podem ser vinculados às publicações;
- possuem Diário do Projeto;
- não possuem preço ou WhatsApp;
- podem ser editados/excluídos;
- cadastro dedicado em `/garagem/adicionar`.

## Banco
Nova coluna em `public.listings`:
`listing_mode = classified | garage`

Isso preserva a integração já existente da Comunidade com `vehicle_id`,
sem duplicar cadastro de veículos.

## Migration obrigatória
Execute:
`supabase/migrations/028_split_garage_classifieds.sql`

Todos os registros antigos permanecem como `classified`.
