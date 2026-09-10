# FULLSEND Style Search

Quatro botões visuais adicionados com as imagens fornecidas:
- Todos
- Turbo
- Antigos
- Rebaixados

## Rebaixados
A busca não fica limitada aos primeiros 200 anúncios.
Ela busca candidatos na tabela por vários termos, remove duplicados e depois
analisa título, features e raw_data.

Critérios:
- rebaixado, stance, carro baixo, socado;
- suspensão a ar, rosca, fixa, coilover;
- molas esportivas, altura regulável;
- aro 17 a 24;
- perfil baixo, tala, cambagem/fitment;
- combinações suspensão + roda grande.

Roda grande sozinha não classifica SUV original como rebaixado.

Esta versão usa classificação textual automotiva real, sem fingir IA visual.
Para análise da fotografia por IA, será necessária uma API/modelo de visão no backend.
