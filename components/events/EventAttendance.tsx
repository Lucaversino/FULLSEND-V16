'use client'
import { useEffect, useState } from 'react'
import { Check, Users } from 'lucide-react'

export default function EventAttendance({eventId,initialCount=0,compact=false}:{eventId:string;initialCount?:number;compact?:boolean}){
  const [going,setGoing]=useState(false)
  const [count,setCount]=useState(initialCount)
  const [busy,setBusy]=useState(false)

  useEffect(()=>{
    let active=true
    fetch(`/api/events/attendance?eventId=${encodeURIComponent(eventId)}`,{cache:'no-store'})
      .then(r=>r.json()).then(j=>{if(active){setGoing(Boolean(j.going));setCount(Number(j.count||0))}}).catch(()=>{})
    return()=>{active=false}
  },[eventId])

  async function toggle(){
    if(busy)return
    setBusy(true)
    const r=await fetch('/api/events/attendance',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({eventId}),
    })
    const j=await r.json().catch(()=>({}))
    setBusy(false)
    if(r.status===401){
      window.location.href=`/login?next=${encodeURIComponent(window.location.pathname+window.location.search)}`
      return
    }
    if(r.ok){setGoing(Boolean(j.going));setCount(Number(j.count||0))}
  }

  return <button type="button" className={`event-going ${going?'confirmed':''} ${compact?'compact':''}`} onClick={toggle} disabled={busy}>
    {going?<Check size={15}/>:<Users size={15}/>}
    <span>{going?'CONFIRMADO':'EU VOU'}</span>
    {!compact?<small>{count.toLocaleString('pt-BR')}</small>:null}
  </button>
}
