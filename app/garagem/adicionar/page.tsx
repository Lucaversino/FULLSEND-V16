import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GarageVehicleForm from '@/components/GarageVehicleForm'

export default async function Page(){
  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()
  if(!user)redirect('/login?next=/garagem/adicionar')
  const {data:p}=await s.from('profiles').select('city,state,account_status').eq('id',user.id).maybeSingle()
  if(p?.account_status==='blocked'||p?.account_status==='suspended'){
    return <main className="section"><div className="container"><div className="empty-state"><h2>CONTA SEM PERMISSÃO</h2><p>Entre em contato com a administração FULLSEND.</p></div></div></main>
  }
  return <main className="section garage-create-page">
    <div className="container narrow">
      <div className="page-head">
        <span className="section-kicker">MINHA GARAGEM</span>
        <h1>ADICIONAR MEU CARRO</h1>
        <p>Cadastre seu carro ou projeto pessoal para aparecer na Comunidade FULLSEND. Ele não será publicado nos classificados.</p>
      </div>
      <GarageVehicleForm defaults={p||undefined}/>
    </div>
  </main>
}
