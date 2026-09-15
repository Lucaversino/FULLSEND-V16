# FULLSEND V17.5.0 — Vender meu carro

## Instalação

1. No SQL Editor do Supabase, execute o conteúdo de `supabase/migrations/029_garage_sell_listing.sql` uma vez. O projeto deve já ter as migrações anteriores, incluindo a 028.
2. Atualize o projeto no GitHub com os arquivos desta versão e faça o deploy na Vercel, mantendo as variáveis de ambiente atuais.
3. Entre na sua conta, abra `/perfil` e clique em **VENDER MEU CARRO** em Minha Garagem.

## Funcionamento

- Botão disponível no painel do proprietário; a API também valida a propriedade do carro.
- Janela com título, descrição, dados técnicos, localização e fotos preenchidos a partir da garagem.
- Complete preço, quilometragem e demais dados obrigatórios. Revise fotos e escolha a capa antes de publicar.
- A publicação cria um classificado separado e vinculado ao carro. O projeto e seu histórico permanecem na garagem.
- As fotos aproveitadas são copiadas no Storage para que remover fotos do anúncio não apague as fotos originais. Fotos externas devem ser adicionadas novamente ao formulário.
- Um carro pode ter apenas um anúncio não vendido. Se ele já existir, a janela oferece acesso ao anúncio e ao painel.
- Depois de marcar um anúncio como vendido, é possível criar outro. Excluir o carro da garagem não exclui o classificado.
- As correções de destaques da V17.4.4 foram mantidas.

## Verificação

Build de produção e checagem TypeScript aprovados. Migração testada em PostgreSQL local: reaplicação, propriedade, bloqueio de duplicidade, nova venda após status vendido e preservação de anúncios ao excluir a garagem.

A publicação com sessão e Storage reais deve ser conferida após instalar o SQL e fazer o deploy. O site em produção não foi alterado por esta entrega.
