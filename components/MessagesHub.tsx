'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare, Send, Loader2, Search, ArrowLeft, Paperclip, X } from 'lucide-react'
import MessageAttachments, { ChatAttachment } from '@/components/MessageAttachments'

type Conv={
  id:string
  other:{id:string;name:string;avatar_url?:string|null;badge?:string|null}
  listing?:{id:string;title:string;slug:string;cover_url?:string|null}|null
  lastMessage?:{body:string;created_at:string;sender_id:string;read_at?:string|null;attachments?:ChatAttachment[]}|null
  unread:number
  last_message_at:string
}
type Msg={id:string;conversation_id:string;sender_id:string;body:string;attachments?:ChatAttachment[];read_at?:string|null;created_at:string}
type PendingAttachment={path:string;name:string;size:number;type:string}

export default function MessagesHub({currentUserId,conversations:initialConversations,selectedId,initialMessages}:{currentUserId:string;conversations:Conv[];selectedId?:string|null;initialMessages:Msg[]}){
  const [conversations,setConversations]=useState(initialConversations)
  const [activeId,setActiveId]=useState(selectedId||initialConversations[0]?.id||'')
  const [messages,setMessages]=useState(initialMessages)
  const [body,setBody]=useState('')
  const [busy,setBusy]=useState(false)
  const [uploading,setUploading]=useState(false)
  const [pending,setPending]=useState<PendingAttachment[]>([])
  const [query,setQuery]=useState('')
  const fileRef=useRef<HTMLInputElement|null>(null)

  const active=conversations.find(x=>x.id===activeId)||null
  const filtered=useMemo(()=>conversations.filter(c=>`${c.other?.name||''} ${c.listing?.title||''}`.toLowerCase().includes(query.toLowerCase())),[conversations,query])

  async function refreshOverview(){
    try{
      const res=await fetch('/api/messages/overview',{cache:'no-store'})
      const data=await res.json()
      if(res.ok&&Array.isArray(data.conversations))setConversations(data.conversations)
    }catch{}
  }

  async function refreshThread(id=activeId){
    if(!id)return
    try{
      const res=await fetch(`/api/messages/${id}`,{cache:'no-store'})
      const data=await res.json()
      if(res.ok&&Array.isArray(data.messages)){
        setMessages(data.messages)
        setConversations(list=>list.map(c=>c.id===id?{...c,unread:0}:c))
      }
    }catch{}
  }

  useEffect(()=>{if(activeId){setPending([]);refreshThread(activeId)}},[activeId])
  useEffect(()=>{
    const timer=window.setInterval(()=>{refreshOverview();if(activeId)refreshThread(activeId)},5000)
    return ()=>window.clearInterval(timer)
  },[activeId])

  async function uploadFiles(files:FileList|null){
    if(!files?.length||!activeId||uploading)return
    const chosen=Array.from(files).slice(0,Math.max(0,3-pending.length))
    if(!chosen.length)return
    setUploading(true)
    try{
      const added:PendingAttachment[]=[]
      for(const file of chosen){
        const form=new FormData()
        form.append('conversationId',activeId)
        form.append('file',file)
        const res=await fetch('/api/messages/upload',{method:'POST',body:form})
        const data=await res.json().catch(()=>({}))
        if(!res.ok)throw new Error(data?.error||`Falha ao enviar ${file.name}.`)
        added.push(data.attachment)
      }
      setPending(prev=>[...prev,...added].slice(0,3))
    }catch(e){alert(e instanceof Error?e.message:'Não foi possível enviar o anexo.')}
    finally{if(fileRef.current)fileRef.current.value='';setUploading(false)}
  }

  async function send(){
    const text=body.trim()
    if((!text&&!pending.length)||busy||!activeId)return
    setBusy(true)
    try{
      const res=await fetch(`/api/messages/${activeId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:text,attachments:pending})})
      const data=await res.json().catch(()=>({}))
      if(!res.ok)throw new Error(data?.error||'Falha ao enviar.')
      setMessages(prev=>[...prev,data.message]);setBody('');setPending([])
      await refreshOverview()
    }catch(e){alert(e instanceof Error?e.message:'Não foi possível enviar.')}
    finally{setBusy(false)}
  }

  async function selectConversation(id:string){
    if(id===activeId)return
    setActiveId(id);setMessages([])
    window.history.replaceState(null,'',`/mensagens?conversa=${encodeURIComponent(id)}`)
    await refreshThread(id)
  }

  return <div className={`messages-shell ${active?'has-active':''}`}>
    <aside className="messages-list-panel">
      <div className="messages-list-head"><div><span>CENTRAL FULLSEND</span><h2>CONVERSAS</h2></div></div>
      <div className="messages-search"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar conversa..."/></div>
      <div className="messages-conversations">
        {filtered.length?filtered.map(c=><button key={c.id} onClick={()=>selectConversation(c.id)} className={`messages-conv ${c.id===activeId?'active':''}`}>
          <div className="messages-avatar">{c.other.avatar_url?<img src={c.other.avatar_url} alt=""/>:<span>{(c.other.name||'U')[0].toUpperCase()}</span>}</div>
          <div className="messages-conv-copy">
            <div className="messages-conv-top"><strong>{c.other.name||'Usuário FULLSEND'}</strong>{c.unread>0?<b>{c.unread}</b>:null}</div>
            {c.listing?<small>{c.listing.title}</small>:null}
            <p>{c.lastMessage?.body||'Conversa iniciada'}</p>
          </div>
        </button>):<div className="messages-empty-small">Nenhuma conversa encontrada.</div>}
      </div>
    </aside>

    <section className="messages-chat-panel">
      {active?<>
        <div className="messages-chat-head">
          <a href="/mensagens" className="messages-mobile-back"><ArrowLeft size={18}/></a>
          <div className="messages-avatar">{active.other.avatar_url?<img src={active.other.avatar_url} alt=""/>:<span>{(active.other.name||'U')[0].toUpperCase()}</span>}</div>
          <div><strong>{active.other.name||'Usuário FULLSEND'}</strong>{active.listing?<a href={`/anuncio/${active.listing.slug}`}>Sobre: {active.listing.title}</a>:<small>Conversa direta</small>}</div>
        </div>

        <div className="messages-thread">
          {messages.length?messages.map(m=>{
            const mine=m.sender_id===currentUserId
            return <div key={m.id} className={`message-row ${mine?'mine':'other'}`}><div className="message-bubble">
              <p>{m.body}</p><MessageAttachments items={m.attachments}/>
              <small>{new Date(m.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small>
            </div></div>
          }):<div className="messages-thread-empty"><MessageSquare size={34}/><h3>COMECE A CONVERSA</h3><p>Envie uma mensagem para este usuário.</p></div>}
        </div>

        {pending.length?<div className="message-pending-files">{pending.map((a,i)=><span key={`${a.path}-${i}`}><Paperclip size={13}/>{a.name}<button type="button" onClick={()=>setPending(p=>p.filter((_,n)=>n!==i))}><X size={12}/></button></span>)}</div>:null}

        <div className="messages-compose">
          <input ref={fileRef} className="chat-hidden-file" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,.doc,.docx" onChange={e=>uploadFiles(e.target.files)}/>
          <button className="messages-attach-btn" type="button" onClick={()=>fileRef.current?.click()} disabled={uploading||pending.length>=3}>{uploading?<Loader2 size={18} className="vip-spin"/>:<Paperclip size={18}/>}</button>
          <textarea value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} maxLength={2000} placeholder="Digite sua mensagem..." rows={2}/>
          <button onClick={send} disabled={busy||uploading||(!body.trim()&&!pending.length)}>{busy?<Loader2 size={18} className="vip-spin"/>:<Send size={18}/>}</button>
        </div>
      </>:<div className="messages-no-active"><MessageSquare size={46}/><h2>SUAS MENSAGENS</h2><p>Quando você conversar com outro usuário, a conversa aparece aqui.</p></div>}
    </section>
  </div>
}
