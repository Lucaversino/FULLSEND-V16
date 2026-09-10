# FULLSEND - VISITANTES & IA

## O que foi criado

No painel `/admin` existe uma nova aba:

**VISITANTES**

Ela mostra:
- visitantes únicos;
- sessões;
- visualizações de página;
- tempo ativo médio;
- usuários online nos últimos 5 minutos;
- sessões de uma página;
- páginas mais acessadas;
- dispositivos;
- navegadores;
- origem/referrer;
- sessões recentes;
- gráfico diário;
- botão **ANALISAR COM IA**.

## Privacidade

O tracker não armazena:
- endereço IP;
- fingerprint;
- localização GPS;
- conteúdo digitado pelo usuário.

Ele usa dois UUIDs aleatórios:
- visitor_key no localStorage;
- session_key no sessionStorage.

Para a análise por IA são enviados somente números agregados. IDs de visitantes e sessões não são enviados ao modelo.

## 1. Rode a migration no Supabase

Supabase > SQL Editor > New Query:

`supabase/migrations/010_site_analytics.sql`

Clique em Run.

## 2. Vercel

Já utilizadas pelo projeto:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Para a análise por IA:
- OPENAI_API_KEY

Opcional:
- OPENAI_ANALYTICS_MODEL=gpt-5.6-luna

Nunca use `NEXT_PUBLIC_` na OPENAI_API_KEY.

## 3. Faça Redeploy

Depois da migration e das variáveis, faça novo deploy na Vercel.

A partir desse deploy o site começa a coletar os dados. O sistema não consegue mostrar visitantes anteriores à instalação.

## Como o tempo é calculado

O navegador incrementa tempo somente enquanto a página está visível.
A cada aproximadamente 30 segundos envia um heartbeat para o servidor.

Assim o painel mostra `tempo ativo`, em vez de simplesmente contar quanto tempo uma aba ficou aberta em segundo plano.

## Arquivos principais

- components/AnalyticsTracker.tsx
- components/admin/AdminAnalytics.tsx
- app/api/analytics/track/route.ts
- app/api/admin/analytics/route.ts
- app/api/admin/analytics/insights/route.ts
- supabase/migrations/010_site_analytics.sql
