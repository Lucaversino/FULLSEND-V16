# FULLSEND - Localização e pré-visualização de importação

## SQL obrigatório
Rode no Supabase, depois da migration 008:

`supabase/migrations/009_import_location_mode.sql`

## Novos modos nas Buscas Auto
- Cidade exata
- Cidade + região próxima
- Todo o estado
- Não filtrar localização

Antes de importar, use **PRÉ-VISUALIZAR**. O painel mostra:
- recebidos;
- aceitos;
- rejeitados;
- cidade/UF de cada resultado;
- motivo da rejeição.

Depois clique **IMPORTAR ACEITOS**.

## Filtro público do site
Na lateral esquerda, Cidade não é mais um campo digitável.
O usuário seleciona o Estado e, em seguida, escolhe a Cidade em um select carregado pela API do IBGE.

A rota `/api/locations/cities` possui cache diário e fallback para cidades recorrentes de SC se a API externa estiver temporariamente indisponível.
