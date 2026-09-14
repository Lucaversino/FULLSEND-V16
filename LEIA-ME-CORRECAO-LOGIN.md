# FULLSEND V17.2.1 — correção da sessão na Comunidade

## Instalação

1. No Supabase do mesmo FULLSEND, abra SQL Editor e execute todo o arquivo `supabase/migrations/027_community_session_repair.sql`.
2. Envie este projeto completo ao mesmo repositório GitHub e faça um novo deploy na Vercel.
3. Depois do deploy, atualize a página da Comunidade com Ctrl+F5. Não é necessário criar conta ou configurar o login novamente.

O SQL é reaplicável e preserva contas e publicações. Ele reinstala as funções/políticas da Comunidade, explicita as permissões de leitura necessárias e solicita a atualização do cache de esquema do Supabase. Também instala a estrutura da Comunidade caso a migração 026 ainda não tenha sido aplicada. Depende das estruturas do FULLSEND existentes até a versão enviada (migrations até 025).

## Causa corrigida

Antes, a identificação do usuário só era preenchida depois de a consulta do feed terminar com sucesso. Uma falha no banco mantinha o usuário como nulo na interface, e o botão “Criar publicação” enviava uma conta já conectada para o login.

Agora a identificação da sessão é consultada de forma independente do feed. Ao clicar em criar publicação, a sessão é verificada pelo servidor antes de abrir o editor. Somente uma resposta que confirme ausência de sessão leva ao login. Falhas temporárias na verificação mostram erro e permitem tentar novamente sem sair da conta.

Erros na consulta da Comunidade agora incluem um código de diagnóstico e diferenciam configuração ausente de falta de permissão. A causa exata do erro do banco exibido no print não pôde ser confirmada sem acesso ao Supabase remoto; o reparo cobre instalação incompleta, permissões usadas pela consulta e atualização do cache de esquema.

Se o feed continuar com erro após SQL e deploy, envie a mensagem completa com o código exibido. Não envie senhas ou chaves.

## Verificação

Compilação do projeto, testes de regressão da sessão e testes do SQL em banco local isolado. O banco e o deployment do usuário não foram acessados ou modificados.
