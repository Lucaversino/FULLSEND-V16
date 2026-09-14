'use client'
import { useState } from 'react'
import { Share2, Copy, MessageCircle, Facebook } from 'lucide-react'

export default function EventShare({title,url,compact=false}:{title:string;url?:string;compact?:boolean}){
  const [open,setOpen]=useState(false)
  const [copied,setCopied]=useState(false)

  function absolute(){
    if(url?.startsWith('http'))return url
    if(typeof window==='undefined')return url||''
    return url?`${window.location.origin}${url}`:window.location.href
  }

  async function nativeShare(){
    const link=absolute()
    if(navigator.share){
      try{await navigator.share({title,text:`Confira este evento no FULLSEND: ${title}`,url:link});return}catch{}
    }
    setOpen(v=>!v)
  }

  async function copy(){
    await navigator.clipboard.writeText(absolute()).catch(()=>{})
    setCopied(true);setTimeout(()=>setCopied(false),1400)
  }

  const link=typeof window!=='undefined'?absolute():url||''
  return <div className={`event-share ${compact?'compact':''}`}>
    <button type="button" className="event-share-main" onClick={nativeShare}><Share2 size={15}/> COMPARTILHAR</button>
    {open?<div className="event-share-menu">
      <a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${title} ${link}`)}`}><MessageCircle size={15}/>WhatsApp</a>
      <a target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}><Facebook size={15}/>Facebook</a>
      <button type="button" onClick={copy}><Copy size={15}/>{copied?'Copiado':'Copiar link'}</button>
    </div>:null}
  </div>
}
