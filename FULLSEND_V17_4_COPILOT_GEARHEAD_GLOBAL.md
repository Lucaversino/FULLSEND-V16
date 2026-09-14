# FULLSEND V17.4 — Copilot Gearhead Global

## Entrega

O FULLSEND Copilot foi ampliado de buscador automotivo para assistente global do site, preservando sua montagem global já existente em app/layout.tsx.

## O que mudou

- personalidade gearhead brasileira, próxima e profissional;
- saudação “Fala, gearhead! Em que posso dar uma força?”;
- seis sugestões rápidas de navegação e descoberta;
- reconhecimento da rota/página atual e dos filtros públicos permitidos;
- reconhecimento seguro de visitante ou usuário autenticado, sem enviar identidade;
- contexto público do anúncio FULLSEND, anúncio parceiro ou evento atual, quando disponível;
- conhecimento explícito das rotas de Classificados, Anunciar, Minha Garagem, Comunidade, Eventos, Perfil, Mensagens e Ajuda;
- orientação correta sobre XP/reputação e impulsionamento atual;
- cards de inventário mantidos para buscas reais de veículos;
- inventário não é consultado em dúvidas simples de navegação, XP, perfil, garagem ou eventos;
- atalhos internos retornados pela IA são convertidos pelo backend por uma lista fixa de rotas;
- descrições, títulos, filtros e demais conteúdos são tratados como dados não confiáveis;
- nenhum dado privado, administrativo, token ou chave é enviado ao modelo.

## Segurança e compatibilidade

- nenhuma migração SQL é necessária;
- nenhuma tabela ou função de banco foi alterada;
- não houve alteração nos fluxos de Classificados, Minha Garagem, Comunidade, Eventos, Mercado Pago, login, Supabase, painel administrativo, XP ou GeckoAPI;
- eventos e anúncios só entram no contexto quando possuem status público;
- o contexto contém somente campos públicos e limitados;
- anúncios recomendados continuam sendo validados contra os IDs realmente retornados pelo backend.

## Configuração

Mantém a configuração existente:

- OPENAI_API_KEY
- OPENAI_COPILOT_MODEL (opcional)

## Validação

Executado com sucesso:

    npm ci
    npm run build

O build de produção concluiu todas as 36 páginas. O ambiente de validação usa Node 20 e exibiu apenas os avisos preexistentes de compatibilidade futura do Supabase com Node 22 e avisos de Autoprefixer.
