# FULLSEND V16.4

Base: V16.3.

Alterações:
- botão PAINEL visível para usuário logado no cabeçalho;
- botão SAIR agora também aparece no celular;
- no mobile, ADMIN fica compacto para caber sem quebrar o header;
- caixa flutuante de MENSAGENS no desktop e celular;
- contador de mensagens não lidas na caixa flutuante;
- a caixa só aparece quando há usuário autenticado;
- se o banco de mensagens estiver indisponível, o botão continua abrindo /mensagens sem derrubar o site.

Arquivos alterados:
- components/Header.tsx
- app/layout.tsx
- app/globals.css

Arquivo novo:
- components/FloatingMessagesButton.tsx

Não foi alterado:
- Mercado Pago / PIX
- VIP / Destaque
- anúncios
- busca
- Supabase migrations
- AdminDashboard
- Gecko
- favicon
- autenticação
