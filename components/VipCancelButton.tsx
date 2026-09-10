'use client'

import { useState } from 'react'
import { XCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function VipCancelButton(){
  const [loading,setLoading]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const router=useRouter()

  async function cancelVip(){
    if(loading)return
    const confirmed=window.confirm(
      'Cancelar sua assinatura FULLSEND VIP? A cobrança recorrente será interrompida.'
    )
    if(!confirmed)return

    setLoading(true)
    setMessage('')
    setError('')

    try{
      const res=await fetch('/api/payments/vip/cancel',{method:'POST'})
      const data=await res.json().catch(()=>({}))

      if(res.status===401){
        window.location.href='/login?next=/perfil'
        return
      }

      if(!res.ok){
        throw new Error(data?.error||'Não foi possível cancelar a assinatura.')
      }

      setMessage(data?.message||'Assinatura cancelada.')
      setLoading(false)
      router.refresh()
    }catch(e){
      setError(e instanceof Error?e.message:'Falha ao cancelar assinatura.')
      setLoading(false)
    }
  }

  return <div className="vip-cancel-wrap">
    <button type="button" className="vip-cancel-button" onClick={cancelVip} disabled={loading}>
      {loading?<Loader2 size={15} className="vip-spin"/>:<XCircle size={15}/>}
      {loading?'CANCELANDO...':'CANCELAR ASSINATURA VIP'}
    </button>
    <small>A renovação recorrente será interrompida no Mercado Pago.</small>
    {message?<div className="vip-cancel-success">{message}</div>:null}
    {error?<div className="vip-cancel-error">{error}</div>:null}
  </div>
}
