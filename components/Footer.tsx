import Image from 'next/image'
import Link from 'next/link'
import { ShieldCheck, LockKeyhole, BadgeCheck } from 'lucide-react'

export default function Footer(){
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand-block">
          <Link href="/" className="footer-logo" aria-label="FULLSEND - página inicial">
            <Image
              src="/fullsend-logo.png"
              alt="FULLSEND"
              width={230}
              height={74}
            />
          </Link>

          <p>
            Marketplace automotivo para veículos, projetos, performance, peças,
            acessórios e cultura automotiva.
          </p>

          <div className="footer-security-badges" aria-label="Informações de segurança">
            <div className="footer-security-badge">
              <LockKeyhole size={17}/>
              <span><b>CONEXÃO SEGURA</b><small>Protegida por HTTPS</small></span>
            </div>

            <div className="footer-security-badge">
              <ShieldCheck size={17}/>
              <span><b>ÁREA PROTEGIDA</b><small>Login e painel autenticados</small></span>
            </div>

            <div className="footer-security-badge">
              <BadgeCheck size={17}/>
              <span><b>FULLSEND</b><small>Ambiente oficial do marketplace</small></span>
            </div>
          </div>
        </div>

        <div className="footer-column">
          <span className="footer-column-title">NAVEGAÇÃO</span>
          <Link href="/">Início</Link>
          <Link href="/explorar">Explorar anúncios</Link>
          <Link href="/anunciar">Anunciar</Link>
          <Link href="/perfil">Minha conta</Link>
        </div>

        <div className="footer-column">
          <span className="footer-column-title">INFORMAÇÕES</span>
          <Link href="/seguranca">Segurança</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de uso</Link>
        </div>

        <div className="footer-trust">
          <ShieldCheck size={30}/>
          <div>
            <span>SITE PROTEGIDO</span>
            <strong>CONEXÃO HTTPS</strong>
            <p>
              A comunicação entre seu navegador e o FULLSEND utiliza conexão
              criptografada HTTPS quando acessado pelo domínio oficial.
            </p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span>© {year} FULLSEND. Todos os direitos reservados.</span>
          <span>FULLSEND Classificados • Brasil</span>
        </div>
      </div>
    </footer>
  )
}
