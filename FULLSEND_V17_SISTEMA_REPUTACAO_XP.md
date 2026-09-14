# FULLSEND V17 — Sistema profissional de reputação e XP

## Níveis
ROOKIE (0) → STREET (250) → GEARHEAD (750) → BUILDER (1.500) → PRO BUILDER (3.000) → ELITE (6.000) → LEGEND (12.000 XP)

## XP automático
- Foto de perfil personalizada: +10 (uma vez)
- Perfil completo: +30 (uma vez)
- Anúncio FULLSEND publicado: +40 por anúncio
- Evento criado pelo usuário e aprovado: +50 por evento
- Confirmar presença em evento: +5 (máx. 25/dia)
- Mensagem enviada: +2 (máx. 20/dia)
- Favorito recebido em anúncio: +3 (máx. 30/dia)

## Anti-farm
O banco mantém `xp_ledger` com chave única por ação/origem. A mesma origem não pontua duas vezes. Ações repetitivas possuem teto diário.

## Painel do usuário
- selo do nível ao lado do nome;
- total de XP;
- barra de progresso;
- roadmap dos 7 níveis;
- XP restante para o próximo nível;
- histórico dos últimos ganhos.

## Painel administrativo
Admin > Usuários agora mostra nível e XP. O administrador pode aplicar ajustes manuais positivos ou negativos. Toda correção fica registrada em `xp_ledger` e `audit_logs`.

## Anúncios
O nível aparece junto ao anunciante nos cards e na página do anúncio. O selo ADM continua separado da reputação.

## Instalação
Execute no Supabase SQL Editor:
`supabase/migrations/023_reputation_xp_system.sql`

Depois faça novo deploy na Vercel.
