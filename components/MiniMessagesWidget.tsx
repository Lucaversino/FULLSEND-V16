'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquareText, X, Search, Send, Paperclip, Loader2, Users, MessagesSquare, ArrowLeft } from 'lucide-react'
import MessageAttachments, { ChatAttachment } from '@/components/MessageAttachments'

type Person={id:string;name:string;avatar_url?:string|null;badge?:string|null;city?:string|null;state?:string|null}
type Conv={id:string;other:Person;listing?:{id:string;title:string;slug:string;cover_url?:string|null}|null;lastMessage?:{body:string;preview?:string;created_at:string;attachments?:ChatAttachment[]}|null;unread:number;last_message_at:string}
type Msg={id:string;conversation_id:string;sender_id:string;body:string;attachments?:ChatAttachment[];created_at:string}
type Pending={path:string;name:string;size:number;type:string}

export default function MiniMessagesWidget({currentUserId,initialUnread=0}:{currentUserId:string;initialUnread?:number}){
  const [open,setOpen]=useState(false)
  useEffect(()=>{
    const closeOther=(e:Event)=>{if(window.matchMedia('(max-width:820px)').matches&&(e as CustomEvent).detail!=='messages')setOpen(false)}
    window.addEventListener('fullsend-mobile-panel',closeOther)
    return ()=>window.removeEventListener('fullsend-mobile-panel',closeOther)
  },[])
  useEffect(()=>{if(open)window.dispatchEvent(new CustomEvent('fullsend-mobile-panel',{detail:'messages'}))},[open])
  const [tab,setTab]=useState<'conversations'|'contacts'>('conversations')
  const [conversations,setConversations]=useState<Conv[]>([])
  const [contacts,setContacts]=useState<Person[]>([])
  const [activeId,setActiveId]=useState('')
  const [messages,setMessages]=useState<Msg[]>([])
  const [body,setBody]=useState('')
  const [query,setQuery]=useState('')
  const [loading,setLoading]=useState(false)
  const [busy,setBusy]=useState(false)
  const [uploading,setUploading]=useState(false)
  const [pending,setPending]=useState<Pending[]>([])
  const [unread,setUnread]=useState(initialUnread)
  const inputRef=useRef<HTMLInputElement|null>(null)

  const active=conversations.find(c=>c.id===activeId)||null
  const filteredConvs=useMemo(()=>conversations.filter(c=>`${c.other?.name||''} ${c.listing?.title||''}`.toLowerCase().includes(query.toLowerCase())),[conversations,query])
  const filteredContacts=useMemo(()=>contacts.filter(c=>`${c.name||''} ${c.city||''} ${c.state||''}`.toLowerCase().includes(query.toLowerCase())),[contacts,query])

  async function loadOverview(silent=false){
    if(!silent)setLoading(true)
    try{
      const res=await fetch('/api/messages/overview',{cache:'no-store'})
      const data=await res.json().catch(()=>({}))
      if(!res.ok)throw new Error(data?.error||'Não foi possível carregar as mensagens.')
      setConversations(data.conversations||[]);setContacts(data.contacts||[])
      setUnread((data.conversations||[]).reduce((n:number,c:Conv)=>n+(c.unread||0),0))
    }catch(e){if(!silent)console.error(e)}
    finally{if(!silent)setLoading(false)}
  }

  async function loadThread(id:string){
    if(!id)return
    try{
      const res=await fetch(`/api/messages/${id}`,{cache:'no-store'})
      const data=await res.json().catch(()=>({}))
      if(res.ok){setMessages(data.messages||[]);setConversations(list=>list.map(c=>c.id===id?{...c,unread:0}:c))}
    }catch{}
  }

  useEffect(()=>{if(open)loadOverview()},[open])
  useEffect(()=>{
    if(!open)return
    const timer=window.setInterval(async()=>{await loadOverview(true);if(activeId)await loadThread(activeId)},5000)
    return ()=>window.clearInterval(timer)
  },[open,activeId])

  async function chooseConversation(id:string){setActiveId(id);setMessages([]);setPending([]);await loadThread(id)}
  async function startContact(person:Person){
    setBusy(true)
    try{
      const res=await fetch('/api/messages/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({recipientId:person.id})})
      const data=await res.json().catch(()=>({}))
      if(!res.ok)throw new Error(data?.error||'Não foi possível abrir a conversa.')
      await loadOverview(true);setTab('conversations');setActiveId(data.conversationId);await loadThread(data.conversationId)
    }catch(e){alert(e instanceof Error?e.message:'Não foi possível abrir a conversa.')}
    finally{setBusy(false)}
  }

  async function upload(files:FileList|null){
    if(!files?.length||!activeId||uploading)return
    const chosen=Array.from(files).slice(0,Math.max(0,3-pending.length))
    if(!chosen.length)return
    setUploading(true)
    try{
      const added:Pending[]=[]
      for(const file of chosen){
        const form=new FormData();form.append('conversationId',activeId);form.append('file',file)
        const res=await fetch('/api/messages/upload',{method:'POST',body:form})
        const data=await res.json().catch(()=>({}))
        if(!res.ok)throw new Error(data?.error||`Falha ao enviar ${file.name}.`)
        added.push(data.attachment)
      }
      setPending(prev=>[...prev,...added].slice(0,3))
    }catch(e){alert(e instanceof Error?e.message:'Não foi possível enviar o anexo.')}
    finally{if(inputRef.current)inputRef.current.value='';setUploading(false)}
  }

  async function send(){
    if(!activeId||busy||uploading||(!body.trim()&&!pending.length))return
    setBusy(true)
    try{
      const res=await fetch(`/api/messages/${activeId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:body.trim(),attachments:pending})})
      const data=await res.json().catch(()=>({}))
      if(!res.ok)throw new Error(data?.error||'Não foi possível enviar.')
      setMessages(m=>[...m,data.message]);setBody('');setPending([]);await loadOverview(true)
    }catch(e){alert(e instanceof Error?e.message:'Não foi possível enviar.')}
    finally{setBusy(false)}
  }

  return <>
    <button type="button" className={`floating-messages-button ${open?'active':''}`} onClick={()=>setOpen(v=>!v)} aria-label="Abrir chat FULLSEND">
      <span className="floating-messages-icon"><MessageSquareText size={22}/></span>
      <span className="floating-messages-copy"><b>MENSAGENS</b><small>{unread?`${unread} não lida${unread===1?'':'s'}`:'Chat FULLSEND'}</small></span>
      {unread?<em>{unread>99?'99+':unread}</em>:null}
    </button>

    {open?<section className="mini-chat-window">
      <header className="mini-chat-head">
        <div className="mini-chat-brand"><span><MessageSquareText size={18}/></span><div><small>FULLSEND</small><b>CHAT</b></div></div>
        <div className="mini-chat-head-actions"><a href="/mensagens">CENTRAL</a><button type="button" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      </header>

      {active?<div className="mini-chat-active-head">
        <button type="button" onClick={()=>{setActiveId('');setMessages([])}}><ArrowLeft size={17}/></button>
        <div className="mini-person-avatar">{active.other.avatar_url?<img src={active.other.avatar_url} alt=""/>:<span>{(active.other.name||'U')[0]}</span>}</div>
        <div><b>{active.other.name}</b><small>{active.listing?.title||'Conversa direta'}</small></div>
      </div>:<>
        <div className="mini-chat-tabs">
          <button className={tab==='conversations'?'active':''} onClick={()=>setTab('conversations')}><MessagesSquare size={15}/> CONVERSAS</button>
          <button className={tab==='contacts'?'active':''} onClick={()=>setTab('contacts')}><Users size={15}/> CONTATOS</button>
        </div>
        <label className="mini-chat-search"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={tab==='contacts'?'Buscar contato...':'Buscar conversa...'}/></label>
      </>}

      <div className={`mini-chat-body ${active?'thread':''}`}>
        {loading&&!active?<div className="mini-chat-loading"><Loader2 className="vip-spin" size={22}/>Carregando...</div>:null}
        {!active&&tab==='conversations'&&!loading?(filteredConvs.length?filteredConvs.map(c=>
          <button key={c.id} className="mini-conv-row" onClick={()=>chooseConversation(c.id)}>
            <div className="mini-person-avatar">{c.other.avatar_url?<img src={c.other.avatar_url} alt=""/>:<span>{(c.other.name||'U')[0]}</span>}</div>
            <div className="mini-conv-copy"><div><b>{c.other.name}</b>{c.unread?<em>{c.unread}</em>:null}</div><small>{c.listing?.title||'Conversa direta'}</small><p>{c.lastMessage?.preview||c.lastMessage?.body||'Conversa iniciada'}</p></div>
          </button>
        ):<div className="mini-chat-empty"><MessagesSquare size={28}/><b>NENHUMA CONVERSA</b><p>Seus chats aparecerão aqui.</p></div>):null}

        {!active&&tab==='contacts'&&!loading?(filteredContacts.length?filteredContacts.map(person=>
          <button key={person.id} className="mini-conv-row contact" onClick={()=>startContact(person)} disabled={busy}>
            <div className="mini-person-avatar">{person.avatar_url?<img src={person.avatar_url} alt=""/>:<span>{(person.name||'U')[0]}</span>}</div>
            <div className="mini-conv-copy"><div><b>{person.name||'Usuário FULLSEND'}</b></div><small>{person.city?`${person.city}${person.state?` / ${person.state}`:''}`:'Contato salvo'}</small><p>Iniciar conversa</p></div>
          </button>
        ):<div className="mini-chat-empty"><Users size={28}/><b>NENHUM CONTATO SALVO</b><p>Use SEGUIR nos anunciantes para salvar contatos.</p></div>):null}

        {active?<div className="mini-thread">{messages.length?messages.map(m=>{
          const mine=m.sender_id===currentUserId
          return <div key={m.id} className={`mini-message-row ${mine?'mine':'other'}`}><div className="mini-message-bubble"><p>{m.body}</p><MessageAttachments items={m.attachments}/><small>{new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></div></div>
        }):<div className="mini-chat-empty"><MessageSquareText size={28}/><b>COMECE A CONVERSA</b><p>Envie uma mensagem para este usuário.</p></div>}</div>:null}
      </div>

      {active?<footer className="mini-chat-compose-wrap">
        {pending.length?<div className="mini-pending-files">{pending.map((a,i)=><span key={a.path}><Paperclip size={12}/>{a.name}<button onClick={()=>setPending(p=>p.filter((_,n)=>n!==i))}><X size={11}/></button></span>)}</div>:null}
        <div className="mini-chat-compose">
          <input ref={inputRef} className="chat-hidden-file" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,.doc,.docx" onChange={e=>upload(e.target.files)}/>
          <button type="button" className="mini-attach-btn" onClick={()=>inputRef.current?.click()} disabled={uploading||pending.length>=3}>{uploading?<Loader2 size={17} className="vip-spin"/>:<Paperclip size={17}/>}</button>
          <textarea rows={1} value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Digite uma mensagem..." maxLength={2000}/>
          <button type="button" className="mini-send-btn" onClick={send} disabled={busy||uploading||(!body.trim()&&!pending.length)}>{busy?<Loader2 size={17} className="vip-spin"/>:<Send size={17}/>}</button>
        </div>
        <small className="mini-chat-security">Anexos privados • até 8 MB • máximo 3 por mensagem</small>
      </footer>:null}
    </section>:null}
  </>
}
