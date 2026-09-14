'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, ChevronRight, Gauge, MessageCircle, Send, Sparkles, X, RotateCcw, ExternalLink, MapPin } from 'lucide-react'

type CopilotAction={id:string;label:string;href:string}
type Message={
  id:string
  role:'user'|'assistant'
  content:string
  followUp?:string|null
  recommendations?:Recommendation[]
  actions?:CopilotAction[]
}
type Recommendation={
  id:string
  kind:'gecko'|'fullsend'
  title:string
  price:number|null
  city:string|null
  state:string|null
  image:string|null
  url:string
  externalUrl?:string|null
  year?:number|null
  mileage?:number|null
  transmission?:string|null
  fuel?:string|null
  vip?:boolean
  featured?:boolean
}

const STORAGE_KEY='fullsend-copilot-session-v2'
const FILTER_KEYS=['q','category','state','city','style','page','dateFrom','dateTo']
const START:Message={
  id:'welcome',
  role:'assistant',
  content:'Fala, gearhead! Em que posso dar uma força?',
  followUp:'Tô por aqui pra ajudar com o site, sua garagem, eventos e dúvidas automotivas básicas.'
}
const QUICK=[
  'Quero anunciar meu carro',
  'Quero adicionar carro à garagem',
  'Procurar eventos',
  'Como funciona o XP?',
  'Buscar carros turbo',
  'Como impulsionar anúncio?',
]
const PAGE_NAMES:Array<[RegExp,string]>=[
  [/^\/$/,'Página inicial'],
  [/^\/explorar/,'Classificados'],
  [/^\/anunciar/,'Anunciar'],
  [/^\/anuncio\/parceiro\//,'Anúncio parceiro'],
  [/^\/anuncio\//,'Página do anúncio'],
  [/^\/garagem\/adicionar/,'Minha Garagem'],
  [/^\/perfil/,'Perfil e painel'],
  [/^\/comunidade/,'Comunidade'],
  [/^\/eventos\/adicionar/,'Cadastrar evento'],
  [/^\/eventos\//,'Página do evento'],
  [/^\/eventos/,'Eventos'],
  [/^\/mensagens/,'Mensagens'],
  [/^\/vip/,'FULLSEND VIP'],
  [/^\/seguranca/,'Ajuda e segurança'],
  [/^\/privacidade/,'Privacidade'],
  [/^\/termos/,'Termos de uso'],
  [/^\/login/,'Login'],
  [/^\/cadastro/,'Cadastro'],
]

function getPageName(pathname:string){
  return PAGE_NAMES.find(([pattern])=>pattern.test(pathname))?.[1]||'FULLSEND'
}
function money(value:number|null){
  if(value==null)return'Consulte'
  return value.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
}
function km(value:number|null|undefined){
  if(value==null)return null
  return Math.round(value).toLocaleString('pt-BR')+' km'
}

export default function FullsendCopilot(){
  const pathname=usePathname()||'/'
  const pageName=getPageName(pathname)
  const [open,setOpen]=useState(false)
  const [messages,setMessages]=useState<Message[]>([START])
  const [input,setInput]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const scrollRef=useRef<HTMLDivElement|null>(null)

  useEffect(()=>{
    try{
      const raw=localStorage.getItem(STORAGE_KEY)
      if(raw){
        const parsed=JSON.parse(raw)
        if(Array.isArray(parsed)&&parsed.length)setMessages(parsed.slice(-18))
      }
    }catch{}
  },[])

  useEffect(()=>{
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(messages.slice(-18)))}catch{}
    requestAnimationFrame(()=>scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:'smooth'}))
  },[messages,open])

  const apiMessages=useMemo(
    ()=>messages.filter(m=>m.id!=='welcome').map(m=>({role:m.role,content:m.content})).slice(-10),
    [messages]
  )

  function currentContext(){
    const filters:Record<string,string>={}
    try{
      const params=new URLSearchParams(window.location.search)
      for(const key of FILTER_KEYS){
        const value=params.get(key)?.trim()
        if(value)filters[key]=value.slice(0,100)
      }
    }catch{}
    return{pathname,filters}
  }

  async function send(text?:string){
    const value=(text??input).trim()
    if(!value||busy)return
    const user:Message={id:'u-'+Date.now(),role:'user',content:value}
    const next=[...apiMessages,{role:'user' as const,content:value}]
    setMessages(v=>[...v,user])
    setInput('')
    setError('')
    setBusy(true)

    try{
      const r=await fetch('/api/copilot',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:next,context:currentContext()}),
      })
      const j=await r.json()
      if(!r.ok)throw new Error(j.error||'Falha no Copilot.')
      setMessages(v=>[...v,{
        id:'a-'+Date.now(),
        role:'assistant',
        content:j.reply,
        followUp:j.followUp||null,
        recommendations:Array.isArray(j.recommendations)?j.recommendations:[],
        actions:Array.isArray(j.actions)?j.actions:[],
      }])
    }catch(e:any){
      setError(e?.message||'Não consegui responder agora.')
    }finally{
      setBusy(false)
    }
  }

  function reset(){
    setMessages([START])
    setError('')
    setInput('')
    try{localStorage.removeItem(STORAGE_KEY)}catch{}
  }

  return(
    <>
      <button
        type="button"
        className={'copilot-launcher '+(open?'open':'')}
        onClick={()=>setOpen(v=>!v)}
        aria-label={open?'Fechar FULLSEND Copilot':'Abrir FULLSEND Copilot'}
      >
        <span className="copilot-launcher-pulse" aria-hidden="true"/>
        <span className="copilot-launcher-icon">{open?<X size={21}/>:<Bot size={21}/>}</span>
        <span className="copilot-launcher-copy"><small>FULLSEND AI</small><b>COPILOT</b></span>
      </button>

      {open?<aside className="copilot-panel" aria-label="FULLSEND Copilot">
        <header className="copilot-head">
          <div className="copilot-avatar" aria-hidden="true"><Gauge size={22}/><span/></div>
          <div>
            <span>FULLSEND AI</span>
            <strong>COPILOT</strong>
            <small><i/> ONLINE • PARCEIRO GEARHEAD</small>
          </div>
          <button type="button" onClick={reset} title="Nova conversa" aria-label="Nova conversa"><RotateCcw size={16}/></button>
          <button type="button" onClick={()=>setOpen(false)} title="Fechar" aria-label="Fechar"><X size={18}/></button>
        </header>

        <div className="copilot-context-bar">
          <Sparkles size={13}/>
          <span>Você está em <b>{pageName}</b> • ajuda contextual ativa</span>
        </div>

        <div className="copilot-messages" ref={scrollRef}>
          {messages.map(m=><div key={m.id} className={'copilot-message '+m.role}>
            <div className="copilot-bubble">
              {m.role==='assistant'?<span className="copilot-mini-label">COPILOT</span>:null}
              <p>{m.content}</p>
              {m.followUp?<small className="copilot-follow">{m.followUp}</small>:null}
            </div>

            {m.actions?.length?<div className="copilot-actions">
              {m.actions.map(action=><a key={action.id} href={action.href}>
                {action.label}<ChevronRight size={14}/>
              </a>)}
            </div>:null}

            {m.recommendations?.length?<div className="copilot-recommendations">
              {m.recommendations.map(x=><a
                key={x.id}
                className={'copilot-car '+(x.vip?'vip':x.featured?'featured':'')}
                href={x.url}
                target={x.kind==='gecko'?'_blank':undefined}
                rel={x.kind==='gecko'?'noopener noreferrer':undefined}
              >
                <div className="copilot-car-image">
                  {x.image?<img src={x.image} alt="" loading="lazy"/>:<div><Gauge size={22}/></div>}
                  {x.vip?<span className="copilot-car-badge vip">VIP</span>:x.featured?<span className="copilot-car-badge">DESTAQUE</span>:null}
                </div>
                <div className="copilot-car-body">
                  <strong>{x.title}</strong>
                  <b>{money(x.price)}</b>
                  <div className="copilot-car-meta">
                    {x.year?<span>{x.year}</span>:null}
                    {km(x.mileage)?<span>{km(x.mileage)}</span>:null}
                    {x.transmission?<span>{x.transmission}</span>:null}
                  </div>
                  <small><MapPin size={11}/>{x.city||'Brasil'}{x.state?' / '+x.state:''}</small>
                  <em>VER ANÚNCIO <ExternalLink size={11}/></em>
                </div>
              </a>)}
            </div>:null}
          </div>)}

          {busy?<div className="copilot-message assistant">
            <div className="copilot-bubble copilot-thinking">
              <span className="copilot-mini-label">COPILOT</span>
              <div><i/><i/><i/></div>
              <small>Preparando a melhor rota...</small>
            </div>
          </div>:null}

          {error?<div className="copilot-error">{error}</div>:null}
        </div>

        {messages.length<=1?<div className="copilot-quick" aria-label="Sugestões rápidas">
          {QUICK.map(q=><button type="button" key={q} onClick={()=>send(q)} disabled={busy}>
            {q}<ChevronRight size={13}/>
          </button>)}
        </div>:null}

        <form className="copilot-input" onSubmit={e=>{e.preventDefault();send()}}>
          <div>
            <MessageCircle size={16}/>
            <textarea
              value={input}
              onChange={e=>setInput(e.target.value.slice(0,700))}
              onKeyDown={e=>{
                if(e.key==='Enter'&&!e.shiftKey){
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Pergunte sobre o FULLSEND ou sobre carros..."
              aria-label="Mensagem para o FULLSEND Copilot"
              rows={1}
            />
          </div>
          <button type="submit" disabled={busy||!input.trim()} aria-label="Enviar"><Send size={17}/></button>
        </form>

        <footer className="copilot-foot">
          <span>IA pode errar. Dados reais só são usados quando o FULLSEND os fornece.</span>
        </footer>
      </aside>:null}
    </>
  )
}
