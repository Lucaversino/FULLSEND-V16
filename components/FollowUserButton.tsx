'use client'

import { useEffect, useState } from 'react'
import { UserPlus, UserCheck, Loader2 } from 'lucide-react'

export default function FollowUserButton({
  userId,
  compact=false
}:{userId:string;compact?:boolean}){
  const [following,setFollowing]=useState<boolean|null>(null)
  const [busy,setBusy]=useState(false)

  useEffect(()=>{
    let cancelled=false
    fetch(`/api/follows/${encodeURIComponent(userId)}`,{cache:'no-store'})
      .then(async res=>{
        if(res.status===401)return {following:false}
        const data=await res.json().catch(()=>({}))
        return data
      })
      .then(data=>{
        if(!cancelled)setFollowing(Boolean(data?.following))
      })
      .catch(()=>{if(!cancelled)setFollowing(false)})
    return ()=>{cancelled=true}
  },[userId])

  async function toggle(e:React.MouseEvent){
    e.preventDefault()
    e.stopPropagation()
    if(busy)return

    setBusy(true)
    try{
      const res=await fetch(`/api/follows/${encodeURIComponent(userId)}`,{method:'POST'})
      const data=await res.json().catch(()=>({}))

      if(res.status===401){
        window.location.href=`/login?next=${encodeURIComponent(window.location.pathname+window.location.search)}`
        return
      }

      if(!res.ok)throw new Error(data?.error||'Não foi possível atualizar o contato.')
      setFollowing(Boolean(data.following))
    }catch(e){
      alert(e instanceof Error?e.message:'Falha ao atualizar contato.')
    }finally{
      setBusy(false)
    }
  }

  return <button
    type="button"
    className={`follow-user-btn ${following?'following':''} ${compact?'compact':''}`}
    onClick={toggle}
    disabled={busy}
    title={following?'Deixar de seguir':'Seguir e salvar contato'}
  >
    {busy?<Loader2 size={compact?12:14} className="vip-spin"/>:following?<UserCheck size={compact?12:14}/>:<UserPlus size={compact?12:14}/>}
    <span>{following?'SEGUINDO':'SEGUIR'}</span>
  </button>
}
