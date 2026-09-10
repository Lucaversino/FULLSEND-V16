# FULLSEND V10 — MENSAGENS PARA TODOS OS USUÁRIOS

Base: FULLSEND V9 VIP + cancelamento.

## O que foi adicionado
- Caixa de mensagens para TODOS os usuários logados.
- Botão "ENVIAR MENSAGEM" nos anúncios FULLSEND.
- Página `/mensagens`.
- Conversas ligadas ao anúncio quando iniciadas pelo anúncio.
- Conversas diretas preparadas no backend.
- Contador de mensagens não lidas no painel do usuário.
- Atalho MENSAGENS no `/perfil`.
- Marcação automática de mensagens como lidas.
- Responsivo para celular.

## Banco
Execute no Supabase SQL Editor:
`supabase/migrations/012_messages_all_users.sql`

## Segurança
- Nenhuma mensagem fica aberta por RLS no navegador.
- `anon` e `authenticated` não recebem acesso direto às tabelas.
- Toda leitura/escrita passa pelo backend.
- O backend usa a sessão real do usuário.
- Antes de enviar/ler, verifica se o usuário pertence à conversa.
- Usuário não pode abrir conversa consigo mesmo.
- Em conversa de anúncio, o destinatário precisa ser o dono do anúncio ativo.
- Limite de 2000 caracteres por mensagem.

## Arquivos críticos não alterados
- app/page.tsx
- app/layout.tsx
- components/Header.tsx
- middleware.ts
- sistema Gecko
- painel Admin
- Visitantes IA
- Mercado Pago / webhook
- VIP e cancelamento

## Teste
1. Execute a migration 012.
2. Publique o projeto.
3. Crie/login com usuário A.
4. Abra um anúncio publicado pelo usuário B.
5. Clique ENVIAR MENSAGEM.
6. Entre com o usuário B e abra `/perfil` ou `/mensagens`.
7. A mensagem deve aparecer com contador de não lidas.
