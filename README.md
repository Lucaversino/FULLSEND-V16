# FULLSEND Classificados — versão corrigida

Marketplace PWA em Next.js 15 + Supabase + Vercel.

## O que foi corrigido
- Home agora lê os anúncios importados diretamente de `gecko_listings`.
- Removidos cards falsos/placeholder quando não há anúncios.
- Busca e página Explorar consultam anúncios FULLSEND + Gecko.
- Botão **Anunciar** aparece somente para usuário autenticado.
- Rota `/anunciar` é protegida no servidor e redireciona para `/login` sem sessão.
- Cadastro foi refeito com confirmação de e-mail, callback e criação automática de perfil.
- Login e cadastro ganharam mensagens claras de erro/sucesso.
- Layout refeito com visual motorsport mais profissional e responsivo.
- PWA mantido para Android/iPhone/desktop.

## Supabase
Rode primeiro `supabase/migrations/001_fullsend.sql` se ainda não executou a estrutura original.
Depois rode `supabase/migrations/002_production_fix.sql` no SQL Editor.

No Supabase Auth > URL Configuration configure:
- Site URL: sua URL de produção da Vercel
- Redirect URLs: `https://SEU-DOMINIO/auth/callback`

## Vercel
Variáveis obrigatórias:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Segredos de importação permanecem somente no Supabase Edge Function:
- GECKO_API_KEY
- SUPABASE_SERVICE_ROLE_KEY
- FULLSEND_IMPORT_SECRET

## Build
```bash
npm install
npm run build
```

## Correção 2026-09-08 — anúncios Gecko no site
- Cabeçalho simplificado: removidos Explorar / Carros / Turbo / Rodas.
- Home e /explorar forçados como dinâmicos, sem cache de lista vazia.
- Leitura de gecko_listings feita no servidor com SUPABASE_SERVICE_ROLE_KEY quando disponível (a chave nunca vai ao navegador).
- Ordenação por imported_at para mostrar imediatamente os últimos anúncios importados.
- Mensagem de diagnóstico visível se a leitura de gecko_listings falhar.

Na Vercel mantenha configuradas:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

## Leitura dos anúncios importados (correção final)
A home e `/explorar` agora consultam `public.gecko_listings` diretamente via PostgREST com `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `cache: no-store`. Isso elimina dependência da `SUPABASE_SERVICE_ROLE_KEY` para leitura pública. A tabela deve manter a policy SELECT para linhas `status = 'active'`.

## Partner detail pages (2026-09 fix)
- Gecko/OLX cards now open an internal FULLSEND route: `/anuncio/parceiro/[id]`.
- OLX images are proxied through `/api/image` to avoid hotlink/browser loading failures.
- Detail page enriches the imported PLP row with a GeckoAPI OLX PDP request on the server.
- WhatsApp button is only rendered when Gecko PDP returns a usable public phone number. The API key stays server-side.


## Fallback de contato para anúncios importados
Na página interna do anúncio parceiro, se a GeckoAPI retornar um telefone público utilizável, o FULLSEND exibe o botão **FALAR COM ANUNCIANTE** via WhatsApp. Se não houver telefone, o site exibe **VER ANÚNCIO NA OLX** usando `external_url`, sem esconder os detalhes e fotos que já foram exibidos no FULLSEND.

## Atualização modal rápido
- Cards abrem modal instantâneo sem navegar de página.
- Modal usa somente dados já carregados da listagem; não chama Gecko PDP ao abrir.
- Galeria leve com até 8 fotos.
- Anúncios parceiros mostram botão para OLX somente dentro do modal.

## Carrossel de marcas
O projeto inclui `components/BrandCarousel.tsx` e `public/brands/*.svg`.
Os SVGs incluídos são badges genéricos com os nomes das marcas para evitar dependência externa.
Você pode substituir cada arquivo por um logo oficial mantendo o mesmo nome do arquivo.
Clicar em uma marca aplica o filtro `?marca=...` e mantém os demais filtros.
