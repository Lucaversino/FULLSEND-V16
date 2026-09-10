'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Mail, Lock, UserRound, MapPin, Phone } from 'lucide-react'

function GoogleIcon(){
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"/>
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.35l-3.24-2.55c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/>
      <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z"/>
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/>
    </svg>
  )
}

function GoogleButton({ label='CONTINUAR COM GOOGLE' }:{label?:string}){
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')
  const params=useSearchParams()

  async function signInGoogle(){
    setBusy(true); setMsg('')
    const supabase=createClient()
    const next=params.get('next') || '/perfil'
    const safeNext=next.startsWith('/') && !next.startsWith('//') ? next : '/perfil'
    const redirectTo=`${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
    const { error }=await supabase.auth.signInWithOAuth({
      provider:'google',
      options:{ redirectTo, queryParams:{ access_type:'offline', prompt:'select_account' } }
    })
    if(error){ setBusy(false); setMsg(error.message) }
  }

  return <>
    <button type="button" className="google-auth-btn" onClick={signInGoogle} disabled={busy}>
      <GoogleIcon/>
      <span>{busy?'ABRINDO GOOGLE...':label}</span>
    </button>
    {msg?<div className="form-error">{msg}</div>:null}
  </>
}

export function LoginForm(){
  const [msg,setMsg]=useState(''); const [busy,setBusy]=useState(false); const [show,setShow]=useState(false); const router=useRouter(); const params=useSearchParams()
  async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMsg('');const fd=new FormData(e.currentTarget);const supabase=createClient();const {data,error}=await supabase.auth.signInWithPassword({email:String(fd.get('email')).trim(),password:String(fd.get('password'))});if(error){setBusy(false);setMsg(error.message);return}const uid=data.user?.id;const {data:profile}=uid?await supabase.from('profiles').select('account_status').eq('id',uid).maybeSingle():{data:null};if(profile?.account_status==='blocked'||profile?.account_status==='suspended'){await supabase.auth.signOut();setBusy(false);setMsg(profile.account_status==='blocked'?'Esta conta foi bloqueada pelo administrador.':'Esta conta está temporariamente suspensa.');return}setBusy(false);const next=params.get('next')||'/perfil';router.push(next.startsWith('/')&&!next.startsWith('//')?next:'/perfil');router.refresh()}
  return <div className="auth-card">
    <GoogleButton label="ENTRAR COM GOOGLE"/>
    <div className="auth-divider"><span>OU ENTRE COM E-MAIL</span></div>
    <form onSubmit={submit} className="auth-email-form">
      <div className="input-wrap"><Mail size={18}/><input name="email" type="email" placeholder="Seu e-mail" required autoComplete="email"/></div>
      <div className="input-wrap"><Lock size={18}/><input name="password" type={show?'text':'password'} placeholder="Sua senha" required autoComplete="current-password"/><button type="button" className="eye" onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
      <button className="btn btn-red auth-submit fs-hero-action" disabled={busy}>{busy?'ENTRANDO...':'ENTRAR'}</button>
      {msg?<div className="form-error">{msg}</div>:null}
    </form>
    <div className="auth-foot">Ainda não tem conta? <Link href="/cadastro">Criar conta grátis</Link></div>
  </div>
}

export function SignupForm(){
  const [msg,setMsg]=useState(''); const [busy,setBusy]=useState(false); const [show,setShow]=useState(false); const router=useRouter()
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg('')
    const fd=new FormData(e.currentTarget); const email=String(fd.get('email')).trim(); const password=String(fd.get('password')); const state=String(fd.get('state')).trim().toUpperCase()
    if(password.length<8){setBusy(false);setMsg('A senha precisa ter pelo menos 8 caracteres.');return}
    const origin=window.location.origin
    const {data,error}=await createClient().auth.signUp({email,password,options:{emailRedirectTo:`${origin}/auth/callback?next=${encodeURIComponent('/perfil')}`,data:{name:String(fd.get('name')).trim(),city:String(fd.get('city')).trim(),state,whatsapp:String(fd.get('whatsapp')).trim()}}})
    setBusy(false)
    if(error){setMsg(error.message);return}
    if(data.session){router.push('/perfil');router.refresh();return}
    setMsg('Conta criada. Confira seu e-mail e clique no link de confirmação para entrar.')
  }
  return <div className="auth-card">
    <GoogleButton label="CRIAR CONTA COM GOOGLE"/>
    <div className="auth-divider"><span>OU CADASTRE COM E-MAIL</span></div>
    <form onSubmit={submit} className="signup-grid auth-email-form">
      <div className="input-wrap full"><UserRound size={18}/><input name="name" placeholder="Nome ou apelido" required maxLength={60}/></div>
      <div className="input-wrap full"><Mail size={18}/><input name="email" type="email" placeholder="E-mail" required autoComplete="email"/></div>
      <div className="input-wrap"><MapPin size={18}/><input name="city" placeholder="Cidade" required/></div>
      <div className="input-wrap"><input name="state" placeholder="UF" required maxLength={2} style={{paddingLeft:16}}/></div>
      <div className="input-wrap full"><Phone size={18}/><input name="whatsapp" placeholder="WhatsApp com DDD" required inputMode="tel"/></div>
      <div className="input-wrap full"><Lock size={18}/><input name="password" type={show?'text':'password'} placeholder="Senha (mínimo 8 caracteres)" required minLength={8} autoComplete="new-password"/><button type="button" className="eye" onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
      <button className="btn btn-red auth-submit full fs-hero-action" disabled={busy}>{busy?'CRIANDO CONTA...':'CRIAR CONTA'}</button>
      {msg?<div className={msg.startsWith('Conta criada')?'form-success full':'form-error full'}>{msg}</div>:null}
    </form>
    <div className="auth-foot">Já é membro? <Link href="/login">Entrar</Link></div>
  </div>
}
