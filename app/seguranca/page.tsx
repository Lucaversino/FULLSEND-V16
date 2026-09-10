import Link from 'next/link'

export const metadata = { title: 'Segurança' }

export default function Page(){
  return (
    <main className="legal-page">
      <div className="container legal-wrap">
        <span className="legal-kicker">FULLSEND</span>
        <h1>SEGURANÇA</h1>
        <div className="legal-card">
          
<p>O FULLSEND utiliza conexão HTTPS no domínio oficial para proteger a comunicação entre o navegador e o site.</p>
<h2>Conta e acesso</h2>
<p>Áreas como perfil, publicação de anúncios e painel administrativo exigem autenticação. Nunca compartilhe sua senha ou códigos de acesso.</p>
<h2>Negociações</h2>
<p>Antes de fechar qualquer negociação, confirme a identidade do anunciante, os dados do veículo ou produto e as condições do pagamento. O FULLSEND não recomenda pagamentos fora de canais confiáveis.</p>
<h2>Anúncios parceiros</h2>
<p>Alguns anúncios podem vir de plataformas parceiras. Ao abrir o anúncio original, passam a valer também as regras e políticas da plataforma de destino.</p>

        </div>
        <Link href="/" className="legal-back">← VOLTAR PARA O SITE</Link>
      </div>
    </main>
  )
}
