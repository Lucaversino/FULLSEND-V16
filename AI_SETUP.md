# FULLSEND - IA VISUAL PARA REBAIXADOS

## 1. Rode a migration no Supabase
Abra Supabase > SQL Editor > New Query e rode:

`supabase/migrations/006_ai_vehicle_style.sql`

## 2. Configure a OpenAI API Key na Vercel
Vercel > Project > Settings > Environment Variables

Adicione:

OPENAI_API_KEY = sua chave da OpenAI
OPENAI_VISION_MODEL = gpt-5.6-luna

Não use NEXT_PUBLIC_ na chave.

Depois faça Redeploy.

## 3. Painel administrativo
Entre em:

/admin

Abra:

IA REBAIXADOS

Clique:

ANALISAR 4 PENDENTES

A IA usa foto + título + dados do anúncio e grava:
- ai_rebaixado
- ai_roda_grande
- ai_stance
- ai_style_score
- ai_confidence
- ai_reason
- ai_analyzed_at

O botão REBAIXADOS da home prioriza esses dados.

## 4. Correção manual
Na aba IA REBAIXADOS:
- FORÇAR SIM: sempre aparece em Rebaixados
- FORÇAR NÃO: não aparece
- AUTO IA: volta a obedecer a IA

A decisão manual do administrador sempre vence a IA.

## 5. Automação opcional
Existe a rota:

GET /api/ai/process

Ela exige:
Authorization: Bearer CRON_SECRET

Configure CRON_SECRET na Vercel se quiser chamar essa rota por cron/automação.
Ela processa até 4 anúncios pendentes por execução.

## Segurança/custo
A OPENAI_API_KEY fica somente no servidor.
A IA não é chamada quando visitantes clicam no botão Rebaixados.
A análise é feita antes e salva no Supabase, tornando o filtro rápido e controlável.
