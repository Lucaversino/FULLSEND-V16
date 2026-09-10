'use client'

import { useState } from 'react'
import { MessageSquareText, X, Send, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DirectMessageButton({
  recipientId,
  listingId,
  listingTitle
}:{recipientId:string;listingId?:string|null;listingTitle?:string|null}){
  const [open,setOpen]=useState(false)
  const [body,setBody]=useState(listingTitle?`Olá! Tenho interesse no anúncio "${listingTitle}".`:'Olá! Gostaria de conversar com você.')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const router=useRouter()

  async function send(){
    if(busy||!body.trim())return
    setBusy(true);setError('')
    try{
      const res=await fetch('/api/messages/start',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({recipientId,listingId,body})
      })
      const data=await res.json().catch(()=>({}))
      if(res.status===401){
        window.location.href=`/login?next=${encodeURIComponent(window.location.pathname)}`
        return
      }
      if(!res.ok)throw new Error(data?.error||'Não foi possível enviar a mensagem.')
      setOpen(false)
      router.push(`/mensagens?conversa=${encodeURIComponent(data.conversationId)}`)
    }catch(e){
      setError(e instanceof Error?e.message:'Falha ao enviar mensagem.')
      setBusy(false)
    }
  }

  return <>
    <button type="button" className="native-message-btn" onClick={()=>setOpen(true)}>
      <MessageSquareText size={17}/> ENVIAR MENSAGEM
    </button>

    {open?(
      <div className="dm-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
        <div className="dm-modal">
          <div className="dm-head">
            <div><small>FULLSEND CHAT</small><h3>ENVIAR MENSAGEM</h3></div>
            <button type="button" onClick={()=>setOpen(false)}><X size={18}/></button>
          </div>
          <textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={2000} rows={5}/>
          <div className="dm-count">{body.length}/2000</div>
          {error?<div className="dm-error">{error}</div>:null}
          <button type="button" className="dm-send" onClick={send} disabled={busy||!body.trim()}>
            {busy?<Loader2 size={16} className="vip-spin"/>:<Send size={16}/>}
            {busy?'ENVIANDO...':'ENVIAR MENSAGEM'}
          </button>
        </div>
      </div>
    ):null}
  </>
}
