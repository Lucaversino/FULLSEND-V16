import Link from 'next/link'
import { Crown, Sparkles, ArrowRight, Zap } from 'lucide-react'
import VipCancelButton from '@/components/VipCancelButton'
import { createClient } from '@/lib/supabase/server'

export const dynamic='force-dynamic'

export default async function VipPage(){
  let legacySubscription=false
  try{
    const s=await createClient(); const {data:{user}}=await s.auth.getUser()
    if(user){
      const {data:p}=await s.from('profiles').select('vip_subscription_status').eq('id',user.id).maybeSingle()
      legacySubscription=String(p?.vip_subscription_status||'').toLowerCase()==='authorized'
    }
  }catch{}
  return <main className="section vip-safe-page"><div className="container vip-safe-container">
    <section className="vip-safe-hero">
      <span>NOVO FULLSEND IMPULSIONA</span><div className="vip-safe-crown"><Zap size={38}/></div>
      <h1>VIP AGORA É POR ANÚNCIO</h1>
      <p>Sem mensalidade. Você escolhe qual anúncio quer impulsionar e paga somente por aquele período.</p>
      <div className="boost-public-plans"><div><Sparkles/><b>DESTAQUE</b><strong>R$ 4,99</strong><small>7 dias</small></div><div className="vip"><Crown/><b>VIP</b><strong>R$ 9,99</strong><small>15 dias</small></div></div>
      <Link className="btn btn-red" href="/perfil">ESCOLHER UM ANÚNCIO <ArrowRight size={16}/></Link>
      {legacySubscription?<div className="legacy-vip-cancel"><p>Foi encontrada uma assinatura antiga. O novo sistema não precisa dela.</p><VipCancelButton/></div>:null}
    </section>
  </div></main>
}
