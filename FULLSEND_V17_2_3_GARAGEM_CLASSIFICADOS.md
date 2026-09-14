# FULLSEND V17.2.3 — Ativar / Desativar dos Classificados

Base utilizada: FULLSEND V17.2.2 BUSCA USUÁRIOS enviada pelo usuário.

## Alteração
Na garagem do painel do usuário, os anúncios da categoria `carros` agora possuem
um controle direto:

- `DESATIVAR CLASSIFICADOS` quando o carro está publicado;
- `ATIVAR CLASSIFICADOS` quando está pausado;
- o carro permanece salvo na garagem quando desativado;
- ao desativar, o status vira `draft`;
- ao ativar, o status vira `active`;
- carros vendidos não são reativados pelo botão;
- anúncios bloqueados pelo administrador não podem ser reativados pelo usuário.

## Segurança
Foi criada a rota:
`PATCH /api/listings/visibility`

Ela valida a sessão no servidor e só altera um anúncio quando:
- pertence ao usuário logado;
- é da categoria `carros`.

Nenhuma migration nova é necessária.
