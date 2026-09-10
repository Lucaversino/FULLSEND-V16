# FULLSEND - BUSCAS AUTOMÁTICAS POR CATEGORIA

## Nova estrutura
No `/admin` > **BUSCAS AUTO** agora você escolhe:

- Veículos
- Som Automotivo
- Motor e Peças
- Rodas e Pneus
- Suspensão
- Acessórios
- Performance / Turbo

Cada pesquisa pode ter:
- Nome
- Categoria
- Produto / termo
- Cidade
- UF
- 1 a 5 páginas
- Automação ligada/desligada
- Busca manual imediata

## Exemplos

### Chevette em Porto Belo
Categoria: Veículos
Termo: Chevette
Cidade: Porto Belo
UF: SC

### Subwoofer em Itajaí
Categoria: Som Automotivo
Termo: Subwoofer 12
Cidade: Itajaí
UF: SC

### Motor AP
Categoria: Motor e Peças
Termo: Motor AP 1.8
Cidade: Itapema
UF: SC

### Rodas
Categoria: Rodas e Pneus
Termo: Roda aro 18
Cidade: Porto Belo
UF: SC

### Suspensão
Categoria: Suspensão
Termo: Suspensão de rosca
Cidade: Itajaí
UF: SC

### Performance
Categoria: Performance / Turbo
Termo: Turbina .50
Cidade: Blumenau
UF: SC

## SQL obrigatório
Se você já rodou a migration 007, rode agora também:

`supabase/migrations/008_import_categories.sql`

Se está instalando tudo do zero, rode as migrations em ordem.

## Como a busca funciona
- Veículos: pesquisa na área específica de carros/vans/utilitários.
- Demais categorias: usa a área ampla de Autos e Peças e reforça o termo com a categoria.
- Cidade e UF são verificadas novamente antes de salvar.
- O sistema usa retry automático para falhas temporárias da Gecko.

## Automação
O cron diário continua em:

`/api/cron/import-searches`

Somente buscas com o botão **AUTOMÁTICO LIGADO** são executadas.
