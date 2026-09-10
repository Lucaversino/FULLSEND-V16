import { Suspense } from 'react'
import { SignupForm } from '@/components/AuthCard'

function AuthLoading(){
  return <div className="auth-loading">Carregando cadastro...</div>
}

export default function Cadastro(){
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-copy">
          <span className="section-kicker">MEMBRO FULLSEND</span>
          <h1>CRIE SUA<br/><span>GARAGEM.</span></h1>
          <p>Cadastre-se para anunciar carros, peças, rodas, motores, suspensão e som automotivo.</p>
        </div>
        <div>
          <h2>CRIAR CONTA</h2>
          <p className="muted">Seu perfil fica vinculado aos seus anúncios.</p>
          <Suspense fallback={<AuthLoading/>}>
            <SignupForm/>
          </Suspense>
        </div>
      </div>
    </main>
  )
}
