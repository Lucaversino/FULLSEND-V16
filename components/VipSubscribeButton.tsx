'use client'

import { useState } from 'react'
import { Crown, Loader2, LockKeyhole } from 'lucide-react'

export default function VipSubscribeButton(){
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')

  async function subscribe(){
    if(loading)return
    setLoading(true)
    setError('')
    try{
      const res=await fetch('/api/payments/vip/subscribe',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
      })
      const data=await res.json().catch(()=>({}))
      if(res.status===401){
        window.location.href='/login?next=/vip'
        return
      }
      if(!res.ok){
        throw new Error(data?.error||'Não foi possível iniciar a assinatura.')
      }
      if(!data?.checkout_url){
        throw new Error('O Mercado Pago não retornou o link de pagamento.')
      }
      window.location.href=data.checkout_url
    }catch(e){
      setError(e instanceof Error?e.message:'Falha ao iniciar pagamento.')
      setLoading(false)
    }
  }

  return <div className="vip-payment-action">
    <button type="button" className="vip-subscribe-button" onClick={subscribe} disabled={loading}>
      {loading?<Loader2 size={18} className="vip-spin"/>:<Crown size={18}/>}
      <span>
        <b>{loading?'ABRINDO MERCADO PAGO...':'ASSINAR FULLSEND VIP'}</b>
        <small>R$ 19,90 por mês • cobrança recorrente</small>
      </span>
    </button>
    <div className="vip-payment-secure"><LockKeyhole size={12}/> Pagamento processado pelo Mercado Pago. O FULLSEND não recebe os dados do seu cartão.</div>
    {error?<div className="vip-payment-error">{error}</div>:null}
  </div>
}
