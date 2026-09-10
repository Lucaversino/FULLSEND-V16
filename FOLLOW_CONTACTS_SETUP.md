# FULLSEND V11 — SEGUIR USUÁRIO + CONTATOS + MENSAGEM NO MODAL

## Novidades
- Botão ENVIAR MENSAGEM dentro do modal "VER RÁPIDO".
- Botão SEGUIR ao lado da foto/nome do anunciante.
- Ao seguir, o usuário fica salvo em "CONTATOS SALVOS" no /perfil.
- Nos contatos salvos é possível:
  - enviar mensagem;
  - deixar de seguir.
- Funciona para todos os usuários logados.

## Banco
Execute no Supabase SQL Editor:
`supabase/migrations/013_user_follows_contacts.sql`

## Segurança
- O navegador não recebe acesso direto à tabela user_follows.
- Toda ação passa por rota autenticada.
- O ID do usuário que está seguindo vem da sessão.
- Não é permitido seguir a própria conta.
- Home, layout, Header, Mercado Pago, VIP, Admin, Gecko e Visitantes IA não foram alterados.

## Observação
O botão interno aparece apenas em anúncios FULLSEND que possuem um usuário anunciante.
Anúncios importados da OLX/Gecko continuam usando o contato externo, pois não possuem conta FULLSEND associada.
