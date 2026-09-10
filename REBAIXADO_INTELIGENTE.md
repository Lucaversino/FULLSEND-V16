# Filtro REBAIXADO inteligente

O botão REBAIXADO agora usa um classificador por pontuação, analisando:
- título e descrição;
- recursos/features;
- dados brutos importados pela Gecko;
- termos como rebaixado, stance, carro baixo, socado;
- suspensão a ar, rosca, fixa, coilover, molas esportivas;
- rodas grandes (aro 17 a 24), perfil baixo e tala;
- combinações de suspensão + roda grande.

Isso não usa uma API externa de visão e não gera custo por clique.

Para reconhecimento visual real da foto (IA vendo se o carro está baixo e com roda grande),
será necessário integrar depois um serviço de visão/IA no backend e gravar a classificação no banco.
