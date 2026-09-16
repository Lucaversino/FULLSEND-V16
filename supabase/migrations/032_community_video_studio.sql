-- FULLSEND V17.7.0 — vídeos maiores processados pelo FULLSEND Studio
-- Execute este arquivo no SQL Editor do Supabase antes de publicar a versão.

update storage.buckets
set file_size_limit = 209715200,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm']
where id = 'community-media';
