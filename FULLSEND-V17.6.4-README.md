# FULLSEND V17.6.4 — Upload Comunidade 250 MB

Base: V17.6.3 — Verificado + Eventos Inteligentes.

## Alteração
- Publicações da Comunidade aceitam JPG, PNG, WebP, MP4 e WebM de até **250 MB por arquivo**.
- Mantido o limite de até 10 arquivos por publicação.
- Validação atualizada no navegador e na API.
- Bucket `community-media` atualizado para 250 MB por arquivo pela migration 032.

## Supabase
Execute antes do deploy/uso:
`supabase/migrations/032_community_media_250mb.sql`

Observação: o projeto/conta do Supabase também precisa permitir esse tamanho máximo no Storage. Caso o limite global do plano/projeto seja menor, ele prevalece sobre o limite do código.
