# FULLSEND V17.7.0 — Video Studio

## Antes do deploy

Execute `supabase/migrations/032_community_video_studio.sql` no SQL Editor do Supabase. Essa atualização libera vídeos de até 200 MB no bucket privado da comunidade.

## O que mudou

- editor de vídeo responsivo integrado ao formulário de publicação;
- corte de início e fim na timeline;
- timeline com até cinco linhas: uma de vídeo e quatro para músicas;
- ajuste do início e volume de cada música;
- formatos original, vertical 9:16 e quadrado 1:1;
- velocidades 0.5x, 1x, 1.5x e 2x;
- processamento no navegador e saída WebM pronta para publicar;
- opção segura de usar o vídeo original quando o navegador não puder processar;
- limite de vídeo ampliado de 20 MB para 200 MB.
