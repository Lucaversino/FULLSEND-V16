# FULLSEND COPILOT

Assistente automotivo original integrado ao marketplace.

## O que ele faz
- Conversa em português de forma natural.
- Entende orçamento e preferências.
- Pesquisa os anúncios ativos do Supabase.
- Recomenda de 0 a 4 anúncios reais por resposta.
- Mostra cards clicáveis dentro da conversa.
- Entende sinais como turbo, manual, antigo e rebaixado.
- Usa classificação de IA de rebaixados quando já disponível.
- Mantém a conversa durante a sessão no navegador.

## Personagem
O FULLSEND Copilot é um personagem ORIGINAL.
Ele é um gearhead técnico, calmo, confiante e carismático.
Não usa nome, imagem, rosto ou identidade de ator/personagem de filme.

## Vercel
A variável já utilizada pelo projeto continua obrigatória:

OPENAI_API_KEY=...

Opcional:

OPENAI_COPILOT_MODEL=gpt-5.6-luna

Não coloque NEXT_PUBLIC_ na OPENAI_API_KEY.

O modelo fica no servidor. A chave nunca é enviada ao navegador.

## Arquivos principais
- components/FullsendCopilot.tsx
- app/api/copilot/route.ts
- lib/copilot/inventory.ts
- lib/copilot/openai.ts

## Funcionamento
1. Usuário envia mensagem.
2. O backend interpreta sinais básicos da procura.
3. Busca anúncios ativos no Supabase.
4. Ranqueia candidatos.
5. Envia somente candidatos relevantes à IA.
6. A IA conversa e escolhe IDs reais.
7. O frontend mostra os cards selecionados.

A IA não é autorizada a inventar anúncios.

## Exemplos
- "Quero um turbo até 80 mil"
- "Quero um carro manual para fim de semana"
- "Me mostra um antigo para projeto"
- "Quero um rebaixado com roda grande"
- "Qual desses vale mais a pena?"
