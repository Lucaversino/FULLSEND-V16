# FULLSEND V17.4.4 — destaques sincronizados e rodízio

Atualização feita sobre o ZIP V17.4.3 enviado. Não é necessário executar SQL novo.

## Instalação

Atualize os arquivos do mesmo projeto no GitHub, mantendo as variáveis de ambiente atuais, e faça o deploy na Vercel. Após terminar, atualize o site com Ctrl+F5.

## Correções

- Os checkboxes DESTAQUE e VIP na lista administrativa agora salvam imediatamente. Aguarde a mensagem de confirmação. Outros campos continuam usando o botão SALVAR.
- A mudança de uma promoção envia somente o campo alterado: não grava acidentalmente título, preço ou outros dados ainda em edição.
- A seleção percorre todos os anúncios ativos marcados como DESTAQUE ou VIP, em páginas de consulta. Foi retirado o corte nos 60 mais recentes de cada origem.
- O carrossel exibe lotes de até dez cards. Em novos acessos ou no botão Atualizar destaques, prioriza cards ainda não mostrados naquele navegador e filtro, mantendo histórico local do ciclo.
- Quando há mais alternativas, evita repetir o lote anterior. Ao terminar o conjunto, começa outro ciclo. Com dez ou menos destaques, alguns anúncios necessariamente reaparecem, mas a ordem muda e o primeiro card não se repete quando há alternativa. Nenhum card é duplicado dentro do lote; a cópia visual para animação contínua foi mantida.
- A seleção é consultada novamente ao abrir a página, a cada 30 segundos enquanto visível, ao voltar à janela e ao receber uma alteração do painel em outra aba do mesmo navegador.
- A marcação/desmarcação bem-sucedida no painel dispara essa atualização nas outras abas. Outros visitantes recebem as mudanças na próxima consulta de até 30 segundos ou ao recarregar.
- Os filtros de cidade, UF, marca e categoria permanecem aplicados. Anúncios inativos, vendidos ou bloqueados não entram no carrossel.
- A marca agora também filtra anúncios próprios, em vez de excluir todos os anúncios próprios quando havia uma marca selecionada.
- Falhas de consulta mostram um aviso e permitem tentar novamente, sem fingir que a lista foi sincronizada.

Não houve alteração na cobrança ou no webhook do Mercado Pago. Os destaques pagos continuam sendo reconhecidos pelos campos DESTAQUE/VIP que o fluxo existente atualiza.

## Testes

Compilação de produção e TypeScript concluídos. Testes locais de rodízio com 30 anúncios sem repetição até fechar o ciclo; entrada de novo destaque; retirada de desmarcados; VIP; deduplicação; conjunto pequeno; consulta de 205 destaques, inclusive com limite de página do servidor inferior ao solicitado; e filtros de cidade, marca e categoria.

Não houve acesso ao Supabase remoto, deploy na Vercel nem confirmação visual no site publicado. Após atualizar, marque um anúncio ativo, aguarde a confirmação e abra/atualize a página inicial. Teste também desmarcar. Não é preciso cadastrar anúncios novamente.
