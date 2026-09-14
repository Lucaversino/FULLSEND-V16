# FULLSEND V17.2 — Comunidade

Integração feita sobre o projeto V17.1.2 enviado. Não é um segundo site.

## Como instalar

1. No Supabase do FULLSEND, abra **SQL Editor → New query**.
2. Abra `supabase/migrations/026_fullsend_community.sql`, copie todo o conteúdo e execute no SQL Editor. Ela depende das migrations existentes até a 025. Não execute novamente todas as migrations antigas.
3. Atualize os arquivos do mesmo repositório GitHub com este projeto. Preserve as variáveis de ambiente que já estão cadastradas na Vercel.
4. Faça o deploy na Vercel. Acesse `/comunidade` ou clique no novo botão na página inicial.
5. Entre com o login já existente. No painel administrativo, abra a aba **COMUNIDADE**.

O SQL cria as tabelas de publicações, curtidas, comentários, salvos e denúncias, as regras RLS, a consulta paginada e o bucket privado de mídia. Ele roda em transação e pode ser reaplicado. Se houver estruturas de Comunidade criadas fora deste projeto, confira sua compatibilidade antes de executar: a arquitetura analisada foi a dos arquivos enviados, não o banco remoto.

Não há configuração de login adicional. Continuam sendo usadas `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`, esta última exclusivamente no servidor, como no painel atual. Nenhuma chave real foi adicionada ao ZIP.

## O que foi integrado

- Botão Comunidade com a arte PNG transparente fornecida, na coluna dos filtros da página inicial. Os demais botões continuam iguais.
- Feed público com 20 publicações por página e carregamento manual progressivo.
- Publicações de texto, múltiplas fotos e vídeos, edição e exclusão pelo autor.
- Tipos: post normal, meu projeto, dúvida, evento, encontro, antes e depois, upgrade, foto e vídeo.
- Curtidas únicas, comentários com exclusão, salvos privados, compartilhamento por link, WhatsApp e navegador compatível.
- Seguidores reaproveitados de `user_follows`, com o botão de seguir já existente.
- Perfil público com nome, avatar, cidade, bio, contadores e carros. Nenhum perfil duplicado.
- Minha Garagem usa os próprios registros de `listings`. Os carros importados de parceiros não são duplicados nem atribuídos ao usuário.
- Diário do Projeto: título, descrição, anexos, data, peças, potência e custo opcional. Uma mesma publicação aparece no feed e na linha do tempo do carro, evitando cópias em tabelas distintas. O custo informado é público, conforme o aviso do formulário.
- Publicações salvas acessíveis no painel do usuário e na navegação da Comunidade.
- Busca por texto, pessoas, carros/projetos e hashtags dentro da Comunidade.
- Eventos referenciam `events`, e a presença usa `event_attendees`. Para cadastrar um evento, o editor abre o formulário existente em outra aba; depois é possível atualizar a lista e selecioná-lo. A aprovação existente é preservada. “Eu vou” aparece para eventos publicados.
- Moderação administrativa com publicações, comentários, denúncias e usuários denunciados; ocultar, remover, restaurar, suspender e reativar, com registro em `audit_logs`.

## Filtros

- **Para você:** prioriza autores seguidos e a cidade do perfil; depois, recentes. Não usa uma IA externa.
- **Seguindo:** apenas autores seguidos na rede existente.
- **Projetos:** publicações vinculadas a carros.
- **Perto de mim:** cidade/UF informadas; se omitidas, usa a região do perfil. Não solicita GPS. Sem região informada ou cadastrada, não há resultado regional.
- **Eventos:** eventos e encontros vinculados à agenda.
- **Dúvidas:** publicações do tipo dúvida.
- **Mais curtidos:** ordenação por quantidade real de curtidas.
- **Recentes:** data de publicação, com desempate por ID.

## Mídia e moderação

Fotos: JPG, PNG e WebP. Vídeos: MP4 e WebM. Até 10 anexos e 20 MB por arquivo. O upload segue diretamente para o Supabase com autorização temporária, evitando passar o vídeo inteiro pela função da Vercel.

O novo bucket `community-media` é privado. A leitura usa links assinados de 5 minutos. Ocultar/remover impede novos links públicos; um link já emitido pode continuar válido até expirar. O dono e administradores mantêm acesso para revisão. Use “Atualizar feed” se deixar a página aberta e uma mídia expirar.

O upload valida formato e tamanho no cliente; o bucket restringe os MIME types e tamanho. Não há transcodificação nem antivírus externo. Textos são renderizados como texto, sem HTML arbitrário. URLs externas de imagens precisam ser HTTP/HTTPS.

A remoção administrativa preserva o registro para revisão. A exclusão pelo dono remove a publicação. Denúncias mantêm a cópia textual da evidência. Arquivos enviados em um rascunho abandonado não são removidos automaticamente; eventual limpeza de objetos sem referência deve preservar anexos de posts ocultos/removidos.

## Validação realizada

- `npm run build`: concluído, incluindo verificação TypeScript. Há avisos de CSS herdados em `app/globals.css`, sem falha de compilação.
- Migração aplicada e reaplicada em PostgreSQL local via PGlite, com tabelas equivalentes às dependências do projeto.
- Testadas: visualização anônima, impedimento de publicação anônima, edição restrita ao autor, vínculo restrito ao carro do dono, curtida duplicada, salvos privados, seguidores existentes, ocultação e comentários, suspensão, proteção dos campos de acesso do perfil, paginação e filtro regional.
- Testada a compatibilidade da exclusão de um carro existente: o post permanece e seu vínculo passa a nulo.
- Nenhum dado de teste foi incluído no projeto final.

Não foram executados testes autenticados no Supabase remoto, upload real no bucket remoto, pagamento, login Google ou publicação na Vercel, pois não houve acesso às contas/credenciais. A ferramenta de navegador não conseguiu acessar a prévia local; a validação visual em desktop/celular ainda precisa ser feita no seu ambiente.

## Conferência após o deploy

Com duas contas de teste próprias, confira login e sessão existentes; publicar e editar texto/fotos/vídeo; associar carro; registrar uma atualização no diário; curtir/descurtir; comentar/excluir; salvar; seguir e verificar o feed; pesquisar e filtrar; compartilhar; denunciar e moderar com a conta admin. Faça a mesma conferência no celular. Confira também a página inicial, anúncios, eventos, perfil, painel e pagamentos existentes.

A instalação não publica conteúdo automaticamente. Sem publicações reais, o feed mostra uma mensagem de estado vazio.
