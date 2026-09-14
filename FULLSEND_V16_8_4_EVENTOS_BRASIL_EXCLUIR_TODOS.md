# FULLSEND V16.8.4

- Importador Ticketmaster agora busca somente eventos com `countryCode=BR`.
- Removido o fallback global que trouxe eventos americanos.
- Resultado ainda passa por filtro defensivo `country === BR`.
- Adicionado botão `EXCLUIR TODOS` no Admin > Eventos.
- Exclusão em massa exige duas confirmações.
- `event_attendees` é apagado automaticamente pelo cascade do banco.
- Home, anúncios, carrossel, login e pagamentos não foram alterados.
