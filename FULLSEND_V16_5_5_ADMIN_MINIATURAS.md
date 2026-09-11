# FULLSEND V16.5.5 — Miniaturas dos anúncios no painel administrativo

Base: V16.5.4.

Alterações:
- Aba ADMIN > ANÚNCIOS agora mostra miniatura da foto de cada anúncio.
- Anúncios FULLSEND usam `cover_url`.
- Anúncios parceiros/Gecko usam `image_url` através do proxy `/api/image`.
- Quando não existe foto, aparece um placeholder "SEM FOTO".
- Layout ajustado para desktop, tablet e mobile.

Arquivos alterados:
- app/admin/page.tsx
- components/admin/AdminDashboard.tsx
- app/globals.css

Nenhuma lógica de Mercado Pago, PIX, chat, busca, carrossel, Gecko importador ou autenticação foi modificada.
