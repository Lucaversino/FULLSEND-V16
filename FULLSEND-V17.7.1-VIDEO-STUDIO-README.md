# FULLSEND V17.7.1 — VIDEO STUDIO

Base: FULLSEND V17.6.4 (upload de comunidade até 250 MB).

## O que foi adicionado

- Editor de vídeo obrigatório antes do upload para todo vídeo novo da Comunidade.
- Corte por início/fim com duração final.
- Preview vertical 9:16 (1080x1920), sem deformar a imagem.
- Preencher/Ajustar, zoom, deslocamento horizontal/vertical e centralização.
- Capa escolhida a partir do próprio vídeo e salva separadamente.
- Volume, mute e remoção do áudio original.
- Velocidades 0.5x, 1x, 1.5x e 2x.
- Rotação 90/180/270/reset.
- Texto simples arrastável, tamanho e alinhamento.
- Filtros leves: Original, Contraste, Cinema, P&B, Quente e Frio.
- Processamento local sob demanda usando FFmpeg/WebAssembly carregado somente quando o usuário confirma a edição.
- Saída preferencial H.264 + AAC em MP4, 1080x1920.
- Barra de progresso de processamento/upload.
- Conteúdo digitado da publicação permanece no Composer se o processamento falhar.
- Original não é enviado ao Supabase; somente o MP4 final + thumbnail.
- Organização de Storage:
  - `<user_id>/posts/videos/<post_id>-<uuid>.mp4`
  - `<user_id>/posts/thumbnails/<post_id>-<uuid>.jpg`
  - imagens normais em `<user_id>/posts/images/...`
- Metadata do vídeo fica dentro do JSONB `media` existente (duration, width, height, aspectRatio, posterPath), sem criar/remover colunas.
- Feed usa a thumbnail como poster do vídeo.
- Layout desktop em 3 áreas e mobile touch-friendly.

## Banco / Supabase

Antes de publicar esta versão, execute no SQL Editor:

`supabase/migrations/033_community_video_editor.sql`

A migration não remove colunas. Ela apenas atualiza a validação de `media` e a policy de leitura das thumbnails.

A migration 032 de 250 MB deve continuar aplicada.

## Performance

O editor é carregado por `next/dynamic` somente quando um vídeo é selecionado. O motor FFmpeg/WebAssembly é baixado sob demanda no momento do processamento; ele não entra no carregamento inicial da home/comunidade.

## Observação para vídeos muito grandes

A interface aceita até 250 MB como a versão anterior, mas processamento WebAssembly depende da memória disponível no dispositivo. O código está isolado para permitir migrar vídeos grandes para um worker/backend dedicado futuramente sem mudar o Composer.
