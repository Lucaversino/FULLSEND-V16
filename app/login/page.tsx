import { Suspense } from 'react'
import { LoginForm } from '@/components/AuthCard'

function AuthLoading(){
  return <div className="auth-loading">Carregando login...</div>
}

export default function Login(){
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-copy">
          <span className="section-kicker">ÁREA DO MEMBRO</span>
          <h1>ENTRE NA<br/><span>GARAGEM.</span></h1>
          <p>Acesse seu perfil, publique anúncios e gerencie seus projetos no FULLSEND.</p>
        </div>
        <div>
          <h2>ENTRAR</h2>
          <p className="muted">Use o e-mail e a senha da sua conta.</p>
          <Suspense fallback={<AuthLoading/>}>
            <LoginForm/>
          </Suspense>
        </div>
      </div>
    </main>
  )
}
