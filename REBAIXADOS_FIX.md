# Correção do filtro REBAIXADOS

O problema era que a busca anterior dependia de palavras encontradas em consultas
específicas e podia retornar zero.

Agora:
- carrega até 1000 anúncios ativos em páginas de 200;
- analisa título, features, descrição e raw_data;
- prioriza "rebaixado", suspensão a ar/rosca/fixa, coilover;
- reconhece aro 17-24, perfil baixo, tala, fitment/cambagem;
- evita SUV/picape original entrar só por ter roda grande;
- se houver poucos casos explícitos, completa com candidatos prováveis.

Isto é classificação textual automotiva. Para IA visual real, vendo a fotografia
do veículo, será necessário integrar posteriormente uma API/modelo de visão.
