import Image from 'next/image'
import Link from 'next/link'
import { Search, User, LogIn, ShieldCheck, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null as any }

  return (
    <header className="site-header">
      <div className="container header-inner header-simple">
        <Link href="/" className="brand">
          <Image src="/fullsend-logo.png" alt="FULLSEND" width={250} height={80} priority />
        </Link>

        <div className="header-spacer" />

        <div className="header-actions">
          <Link className="community-header-link" href="/comunidade" aria-label="Abrir Comunidade FULLSEND">
            <Users size={18}/><span>COMUNIDADE</span>
          </Link>
          <Link className="icon-link fx-icon-btn" href="/explorar" aria-label="Pesquisar">
            <Search size={19} />
          </Link>

          {user ? (
            <>
              {profile?.role === 'admin' ? (
                <Link className="admin-header-link fx-admin-btn" href="/admin">
                  <ShieldCheck size={16} /> ADMIN
                </Link>
              ) : null}

              <Link className="user-panel-header-link" href="/perfil" aria-label="Abrir painel do usuário">
                <User size={18} />
                <span>PAINEL</span>
              </Link>

              <Link className="announce-btn fs-art-button fs-announce-art-button" href="/anunciar" aria-label="Anunciar">
                <Image src="/fullsend-anunciar.png" alt="" width={2048} height={682} priority/>
                <span className="sr-only">Anunciar</span>
              </Link>

              <LogoutButton />
            </>
          ) : (
            <>
              <Link className="login-link fx-main-btn fx-main-btn-dark fs-hero-action fs-hero-action-dark" href="/login">
                <span className="fs-btn-scan" aria-hidden="true" />
                <LogIn size={16} />
                <span>ENTRAR</span>
              </Link>

              <Link className="fs-art-button fs-create-account-art-button" href="/cadastro" aria-label="Criar conta">
                <Image src="/fullsend-criar-conta.png" alt="" width={2048} height={682} priority/>
                <span className="sr-only">Criar conta</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
