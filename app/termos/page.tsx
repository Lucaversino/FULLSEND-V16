import Link from 'next/link'

export const metadata = { title: 'Termos De Uso' }

export default function Page(){
  return (
    <main className="legal-page">
      <div className="container legal-wrap">
        <span className="legal-kicker">FULLSEND</span>
        <h1>TERMOS DE USO</h1>
        <div className="legal-card">
          
<p>Ao utilizar o FULLSEND, o usuário concorda em fornecer informações verdadeiras e utilizar a plataforma de forma lícita.</p>
<h2>Anúncios</h2>
<p>O anunciante é responsável pelas informações, imagens, preço, disponibilidade e condições do item anunciado.</p>
<h2>Negociações</h2>
<p>O FULLSEND funciona como ambiente de classificados e descoberta de anúncios. As partes são responsáveis por verificar produto, documentação, pagamento e entrega antes de concluir uma negociação.</p>
<h2>Conteúdo de terceiros</h2>
<p>Anúncios identificados como parceiros podem direcionar para serviços externos, que possuem seus próprios termos e políticas.</p>

        </div>
        <Link href="/" className="legal-back">← VOLTAR PARA O SITE</Link>
      </div>
    </main>
  )
}
