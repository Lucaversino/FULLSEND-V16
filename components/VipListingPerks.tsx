'use client'

import { useState } from 'react'
import { Crown, Sparkles, Loader2, LockKeyhole } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function VipListingPerks({
  listingId,
  initialVip,
  initialFeatured,
  canUse,
}:{
  listingId:string
  initialVip:boolean
  initialFeatured:boolean
  canUse:boolean
}){
  const [vip,setVip]=useState(Boolean(initialVip))
  const [featured,setFeatured]=useState(Boolean(initialFeatured))
  const [busy,setBusy]=useState<''|'vip'|'featured'>('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const router=useRouter()

  async function toggle(perk:'vip'|'featured'){
    if(!canUse||busy)return
    const current=perk==='vip'?vip:featured
    setBusy(perk);setMessage('');setError('')

    try{
      const res=await fetch('/api/listings/vip-perks',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({listingId,perk,enabled:!current})
      })
      const data=await res.json().catch(()=>({}))

      if(res.status===401){
        window.location.href='/login?next=/perfil'
        return
      }
      if(!res.ok)throw new Error(data?.error||'Não foi possível atualizar o anúncio.')

      setVip(Boolean(data.is_vip))
      setFeatured(Boolean(data.is_featured))
      setMessage(String(data.message||'Benefício atualizado.'))
      router.refresh()
    }catch(e){
      setError(e instanceof Error?e.message:'Falha ao atualizar benefício.')
    }finally{
      setBusy('')
    }
  }

  if(!canUse){
    return <div className="vip-listing-perks locked">
      <LockKeyhole size={14}/>
      <span>VIP/Destaque disponível somente com assinatura VIP ativa.</span>
      <a href="/vip">ATIVAR VIP</a>
    </div>
  }

  return <div className="vip-listing-perks">
    <div className="vip-listing-perks-label">
      <Crown size={14}/>
      <span>BENEFÍCIOS VIP DO ANÚNCIO</span>
    </div>
    <div className="vip-listing-perks-buttons">
      <button type="button" className={`vip-perk-button gold ${vip?'active':''}`} onClick={()=>toggle('vip')} disabled={Boolean(busy)}>
        {busy==='vip'?<Loader2 size={14} className="vip-spin"/>:<Crown size={14}/>} {vip?'VIP ATIVO':'ATIVAR VIP'}
      </button>
      <button type="button" className={`vip-perk-button red ${featured?'active':''}`} onClick={()=>toggle('featured')} disabled={Boolean(busy)}>
        {busy==='featured'?<Loader2 size={14} className="vip-spin"/>:<Sparkles size={14}/>} {featured?'DESTAQUE ATIVO':'ATIVAR DESTAQUE'}
      </button>
    </div>
    {message?<small className="vip-perk-success">{message}</small>:null}
    {error?<small className="vip-perk-error">{error}</small>:null}
  </div>
}
