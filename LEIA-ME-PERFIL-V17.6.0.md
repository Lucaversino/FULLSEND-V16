FULLSEND V17.6.0 — Perfil personalizado e selos

INSTALAÇÃO
1. Execute supabase/migrations/030_profile_personalization.sql no SQL Editor do Supabase.
2. Atualize o projeto na Vercel pelos arquivos deste ZIP, mantendo suas variáveis atuais.
3. No painel, clique em EDITAR PERFIL para trocar a capa, escolher a cor e preencher a biografia opcional.

A capa aceita JPG, PNG e WebP de até 3 MB. Recomendado: imagem horizontal de 1600 × 500. Use até 4 MB somando foto e capa por envio; se necessário, salve separadamente. O bucket profile-avatars já existente é reutilizado. Usar capa padrão remove a capa do perfil sem apagar arquivos antigos.

As artes enviadas foram associadas aos níveis atuais, sem modificar as regras de XP:
ROOKIE: 0; STREET: 250; GEARHEAD: 750; BUILDER: 1500; PRO BUILDER: 3000; ELITE: 6000; LEGEND: 12000.
O Builder dourado foi associado a BUILDER e o turquesa a PRO BUILDER. Ambas as artes recebidas contêm a palavra Builder; o nome do nível também é exibido pelo site.
O selo ADM é independente do XP e não pode ser escolhido pelo editor do usuário.

Cards menores na garagem pública, cenário decorativo de garagem, cor de destaque personalizada e capa responsiva. Selos no perfil público, painel, progresso de XP e demais locais que usam os componentes de selo.

Inclui todas as edições anteriores: mobile compacto, Sair, mural com mídia primeiro, editor simples e venda pela garagem. A migração 029 continua necessária para a venda pela garagem se ainda não foi aplicada.

Build e TypeScript verificados. Não houve alteração no site em produção; conferir upload e gravação com sua sessão após aplicar o SQL e publicar.
