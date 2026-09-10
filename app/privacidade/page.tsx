import Link from 'next/link'

export const metadata = { title: 'Privacidade' }

export default function Page(){
  return (
    <main className="legal-page">
      <div className="container legal-wrap">
        <span className="legal-kicker">FULLSEND</span>
        <h1>PRIVACIDADE</h1>
        <div className="legal-card">
          
<p>O FULLSEND utiliza informações necessárias para autenticação, funcionamento da conta, publicação e administração de anúncios.</p>
<h2>Dados da conta</h2>
<p>Dados como nome, e-mail, perfil e informações fornecidas pelo usuário podem ser usados para disponibilizar os recursos da plataforma.</p>
<h2>Segurança</h2>
<p>Credenciais e chaves privadas do sistema não devem ser expostas no navegador. O acesso administrativo utiliza autenticação e permissões específicas.</p>
<h2>Analytics e métricas de uso</h2>
<p>O FULLSEND pode registrar métricas próprias de navegação, como páginas visitadas, duração ativa da sessão, tipo geral de dispositivo e origem de acesso. O sistema foi projetado sem armazenar endereço IP ou criar fingerprint do dispositivo.</p>
<h2>Serviços integrados</h2>
<p>O site pode utilizar serviços externos necessários ao funcionamento, como autenticação, banco de dados, hospedagem e fontes de anúncios parceiros.</p>

        </div>
        <Link href="/" className="legal-back">← VOLTAR PARA O SITE</Link>
      </div>
    </main>
  )
}
