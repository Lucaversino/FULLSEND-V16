'use client'

import { useEffect, useRef, useState } from 'react'
import { Crown, Sparkles, X, Copy, CheckCircle2, Loader2, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Checkout={promotion_id:string;payment_id:string;status:string;qr_code?:string|null;qr_code_base64?:string|null;ticket_url?:string|null;amount:number;days:number;label:string}

export default function ListingBoostButton({listingId,title,status='active',initialVip=false,initialFeatured=false}:{listingId:string;title:string;status?:string;initialVip?:boolean;initialFeatured?:boolean}){
  const router=useRouter()
  const [open,setOpen]=useState(false)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [checkout,setCheckout]=useState<Checkout|null>(null)
  const [paid,setPaid]=useState(false)
  const timer=useRef<ReturnType<typeof setInterval>|null>(null)

  useEffect(()=>()=>{if(timer.current)clearInterval(timer.current)},[])

  async function start(type:'featured'|'vip'){
    if(status!=='active')return
    setBusy(type);setError('');setPaid(false)
    try{
      const res=await fetch('/api/payments/promotions/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({listingId,promotionType:type})})
      const data=await res.json().catch(()=>({}))
      if(!res.ok)throw new Error(data?.error||'Não foi possível gerar o Pix.')
      setCheckout(data)
      poll(data.promotion_id)
    }catch(e){setError(e instanceof Error?e.message:'Erro ao gerar Pix.')}finally{setBusy('')}
  }

  function poll(id:string){
    if(timer.current)clearInterval(timer.current)
    timer.current=setInterval(async()=>{
      try{
        const res=await fetch(`/api/payments/promotions/status?promotionId=${encodeURIComponent(id)}`,{cache:'no-store'})
        const data=await res.json().catch(()=>({}))
        if(data?.status==='approved'){
          if(timer.current)clearInterval(timer.current)
          timer.current=null
          setPaid(true)
          setTimeout(()=>{setOpen(false);setCheckout(null);router.refresh()},1800)
        }else if(['rejected','cancelled','refunded','failed'].includes(data?.status)){
          if(timer.current)clearInterval(timer.current)
          timer.current=null
          setError('O pagamento não foi aprovado. Gere um novo Pix para tentar novamente.')
        }
      }catch{}
    },4000)
  }

  async function copyPix(){
    if(!checkout?.qr_code)return
    await navigator.clipboard.writeText(checkout.qr_code)
  }

  function close(){
    if(timer.current)clearInterval(timer.current)
    timer.current=null;setOpen(false);setCheckout(null);setError('');setPaid(false)
  }

  return <>
    <button type="button" className="listing-boost-btn" disabled={status!=='active'} onClick={()=>setOpen(true)}><Zap size={14}/> {status==='active'?'IMPULSIONAR':'INDISPONÍVEL'}</button>
    {open?<div className="boost-overlay" role="dialog" aria-modal="true">
      <div className="boost-modal">
        <button className="boost-close" onClick={close}><X size={20}/></button>
        {!checkout&&!paid?<>
          <div className="boost-head"><span>FULLSEND IMPULSIONA</span><h2>IMPULSIONE SEU ANÚNCIO</h2><p>{title}</p></div>
          <div className="boost-plans">
            <button className="boost-plan featured" onClick={()=>start('featured')} disabled={!!busy||initialFeatured}>
              <Sparkles/><span><b>DESTAQUE</b><small>7 dias no carrossel</small></span><strong>{initialFeatured?'ATIVO':'R$ 4,99'}</strong>{busy==='featured'?<Loader2 className="vip-spin"/>:null}
            </button>
            <button className="boost-plan vip" onClick={()=>start('vip')} disabled={!!busy||initialVip}>
              <Crown/><span><b>VIP</b><small>15 dias • visual dourado</small></span><strong>{initialVip?'ATIVO':'R$ 9,99'}</strong>{busy==='vip'?<Loader2 className="vip-spin"/>:null}
            </button>
          </div>
          <div className="boost-security">O anúncio só é ativado após a confirmação real do pagamento pelo Mercado Pago.</div>
        </>:paid?<div className="boost-paid"><CheckCircle2/><h2>PAGAMENTO APROVADO</h2><p>Seu anúncio foi impulsionado automaticamente.</p></div>:<>
          <div className="boost-head"><span>PAGAMENTO PIX</span><h2>{checkout.label} • R$ {checkout.amount.toFixed(2).replace('.',',')}</h2><p>Após o pagamento, esta tela confirma automaticamente.</p></div>
          <div className="boost-pix">
            {checkout.qr_code_base64?<img src={`data:image/png;base64,${checkout.qr_code_base64}`} alt="QR Code Pix"/>:<div className="boost-pix-wait"><Loader2 className="vip-spin"/> QR Code sendo preparado</div>}
            {checkout.qr_code?<><textarea readOnly value={checkout.qr_code}/><button onClick={copyPix}><Copy size={15}/> COPIAR PIX</button></>:null}
            <div className="boost-await"><span/><b>AGUARDANDO PAGAMENTO...</b><small>Mercado Pago • atualização automática</small></div>
          </div>
        </>}
        {error?<div className="boost-error">{error}</div>:null}
      </div>
    </div>:null}
  </>
}
