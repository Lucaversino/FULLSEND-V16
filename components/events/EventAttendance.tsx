'use client'
import { useEffect, useState } from 'react'
import { Check, Users } from 'lucide-react'

export default function EventAttendance({eventId,initialCount=0,compact=false}:{eventId:string;initialCount?:number;compact?:boolean}){
  const [going,setGoing]=useState(false)
  const [count,setCount]=useState(initialCount)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  useEffect(()=>{
    let active=true
    fetch(`/api/events/attendance?eventId=${encodeURIComponent(eventId)}`,{cache:'no-store'})
      .then(async r=>{if(!r.ok)throw new Error();return r.json()})
      .then(j=>{if(active){setGoing(Boolean(j.going));setCount(Number(j.count||0))}})
      .catch(()=>{if(active)setError('Não foi possível atualizar as presenças.')})
    return()=>{active=false}
  },[eventId])
  async function toggle(){
    if(busy)return
    setBusy(true);setError('')
    try{
      const r=await fetch('/api/events/attendance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId})})
      const j=await r.json().catch(()=>({}))
      if(r.status===401){window.location.href=`/login?next=${encodeURIComponent(window.location.pathname+window.location.search)}`;return}
      if(!r.ok)throw new Error('Não foi possível confirmar sua presença. Confira se sua conta está ativa e tente novamente.')
      setGoing(Boolean(j.going));setCount(Number(j.count||0))
    }catch(e){setError(e instanceof Error?e.message:'Falha de conexão. Tente novamente.')}finally{setBusy(false)}
  }
  return <><button type="button" className={`event-going ${going?'confirmed':''} ${compact?'compact':''}`} onClick={toggle} disabled={busy} aria-pressed={going}>
    {going?<Check size={15}/>:<Users size={15}/>}<span>{going?'CONFIRMADO':'EU VOU'}</span>{!compact?<small>{count.toLocaleString('pt-BR')}</small>:null}
  </button>{error?<small role="alert" style={{display:'block',color:'#ff919b',marginTop:6}}>{error}</small>:null}</>
}
