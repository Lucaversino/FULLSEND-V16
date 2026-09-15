-- FULLSEND V17.6.4 — Comunidade: anexos de até 250 MB por arquivo
-- Execute no Supabase SQL Editor antes de usar uploads acima do limite anterior.

update storage.buckets
set file_size_limit = 262144000,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm']
where id = 'community-media';
