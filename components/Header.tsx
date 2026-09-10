import Image from 'next/image'
import Link from 'next/link'
import { Search, User, Plus, LogIn, ShieldCheck } from 'lucide-react'
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

              <Link className="icon-link fx-icon-btn" href="/perfil" aria-label="Perfil">
                <User size={19} />
              </Link>

              <Link className="btn btn-red announce-btn fx-main-btn fx-main-btn-red fs-hero-action" href="/anunciar">
                <span className="fs-btn-scan" aria-hidden="true" />
                <span className="fs-btn-orbit" aria-hidden="true" />
                <Plus size={16} />
                <span>ANUNCIAR</span>
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

              <Link className="btn btn-red fx-main-btn fx-main-btn-red fs-hero-action" href="/cadastro">
                <span className="fs-btn-scan" aria-hidden="true" />
                <span className="fs-btn-orbit" aria-hidden="true" />
                <span>CRIAR CONTA</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
