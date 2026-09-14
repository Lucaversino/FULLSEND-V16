# FULLSEND V17.3 — Botões e localização de eventos

## Alterações desta versão

- Novas artes transparentes nos botões BUSCAR e ANUNCIAR.
- Links e ações originais preservados.
- Layout responsivo, foco por teclado, hover e área clicável mantidos.
- Cadastro e edição de eventos com endereço, link do Google Maps e coordenadas opcionais.
- Link do Google Maps tem prioridade no botão de abertura.
- Endereço e coordenadas antigas continuam compatíveis.
- O bloco do mapa não é renderizado quando o evento não possui localização.
- Alterações aplicadas ao cadastro do usuário, edição no painel do usuário e edição administrativa.

## Banco de dados — executar antes da publicação

No Supabase, abra o SQL Editor e execute:

    alter table public.events
      add column if not exists google_maps_url text;

O mesmo comando está no arquivo:

    supabase/migrations/026_event_google_maps_url.sql

A alteração é segura e não apaga nem modifica eventos antigos.

## Verificação

Build de produção executado com sucesso em Next.js 15.5.25.
