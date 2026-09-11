# FULLSEND V16.5 — CHAT FLUTUANTE PROFISSIONAL

## Novidades
- Mini chat flutuante dentro do site, sem redirecionar imediatamente.
- Abas Conversas e Contatos Salvos.
- Início de conversa com contatos salvos.
- Botão CENTRAL para abrir /mensagens.
- Mini chat e central usam as mesmas mensagens e conversas.
- Atualização automática a cada 5 segundos.
- Anexos nos dois chats: JPG, PNG, WEBP, GIF, PDF, TXT, DOC e DOCX.
- Máximo 8 MB por arquivo e 3 anexos por mensagem.
- Bucket privado no Supabase Storage e links temporários.

## Migration obrigatória
Execute no Supabase SQL Editor:
supabase/migrations/015_message_attachments.sql

## Preservado
Mercado Pago, PIX, VIP/Destaque, impulsionamentos, Gecko, Admin, busca, favicon, anúncios e autenticação não foram refeitos.
