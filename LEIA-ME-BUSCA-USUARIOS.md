# FULLSEND V17.2.2 — busca de usuários

Para atualizar a versão 17.2.1 que já está funcionando, envie este projeto ao mesmo repositório GitHub e faça o deploy na Vercel. Não é necessário executar SQL novo nem configurar o login novamente.

Alterações:
- Foto do perfil nos resultados de pessoas da busca principal.
- Busca exclusiva por nome de usuário no lado esquerdo da Comunidade, independente do feed.
- Lista inicial de até cinco membros reais ativos, ordenados pelos cadastros mais recentes, excluindo a própria conta das sugestões.
- Pesquisa ao digitar, botão de busca e navegação para ver mais usuários.
- Foto, nome e cidade/UF; clique abre o perfil público. Quem não tem foto ou tem imagem indisponível aparece com a inicial do nome.
- No celular, a busca de usuários aparece acima do feed.

A listagem utiliza a tabela de perfis existente. Nenhum dado fictício foi criado. A correção de sessão da versão 17.2.1 foi preservada.

Validação: compilação de produção e verificação TypeScript. Não houve deploy ou teste com dados do Supabase remoto nesta atualização.
