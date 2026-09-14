import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EventSuggestForm from '@/components/events/EventSuggestForm'

export const metadata:Metadata={
  title:'Adicionar evento automotivo',
  description:'Sugira um evento automotivo para a agenda FULLSEND.',
  robots:{index:false,follow:false},
}

export default async function AdicionarEvento(){
  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()
  if(!user)redirect('/login?next=/eventos/adicionar')
  return <main className="section events-page">
    <div className="container event-form-container">
      <div className="page-head"><span className="section-kicker">COMUNIDADE FULLSEND</span><h1>ADICIONAR EVENTO</h1><p>Sugira um evento. A publicação acontece após aprovação do administrador.</p></div>
      <EventSuggestForm/>
    </div>
  </main>
}
