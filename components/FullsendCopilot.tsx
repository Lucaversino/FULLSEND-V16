'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, ChevronRight, Gauge, MessageCircle, Send, Sparkles, X, RotateCcw, ExternalLink, MapPin } from 'lucide-react'

type Message={
  id:string
  role:'user'|'assistant'
  content:string
  followUp?:string|null
  recommendations?:Recommendation[]
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

const STORAGE_KEY='fullsend-copilot-session-v1'

const START:Message={
  id:'welcome',
  role:'assistant',
  content:'Fala. Eu sou o FULLSEND Copilot. Me diz o que você quer da próxima máquina — orçamento, uso e estilo — que eu procuro opções reais daqui.',
  followUp:'Quer começar por turbo, projeto antigo, rebaixado ou carro para o dia a dia?'
}

const QUICK=[
  'Turbo até R$ 80 mil',
  'Quero um projeto antigo',
  'Rebaixado com roda grande',
  'Carro manual para fim de semana',
]

function money(value:number|null){
  if(value==null)return'Consulte'
  return value.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
}

function km(value:number|null|undefined){
  if(value==null)return null
  return `${Math.round(value).toLocaleString('pt-BR')} km`
}

export default function FullsendCopilot(){
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

  async function send(text?:string){
    const value=(text??input).trim()
    if(!value||busy)return

    const user:Message={id:`u-${Date.now()}`,role:'user',content:value}
    const next=[...apiMessages,{role:'user' as const,content:value}]
    setMessages(v=>[...v,user])
    setInput('')
    setError('')
    setBusy(true)

    try{
      const r=await fetch('/api/copilot',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:next}),
      })
      const j=await r.json()
      if(!r.ok)throw new Error(j.error||'Falha no Copilot.')

      setMessages(v=>[...v,{
        id:`a-${Date.now()}`,
        role:'assistant',
        content:j.reply,
        followUp:j.followUp||null,
        recommendations:Array.isArray(j.recommendations)?j.recommendations:[],
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
        className={`copilot-launcher ${open?'open':''}`}
        onClick={()=>setOpen(v=>!v)}
        aria-label={open?'Fechar FULLSEND Copilot':'Abrir FULLSEND Copilot'}
      >
        <span className="copilot-launcher-pulse" aria-hidden="true"/>
        <span className="copilot-launcher-icon">{open?<X size={21}/>:<Bot size={21}/>}</span>
        <span className="copilot-launcher-copy">
          <small>FULLSEND AI</small>
          <b>COPILOT</b>
        </span>
      </button>

      {open?<aside className="copilot-panel" aria-label="FULLSEND Copilot">
        <header className="copilot-head">
          <div className="copilot-avatar" aria-hidden="true">
            <Gauge size={22}/>
            <span/>
          </div>
          <div>
            <span>FULLSEND AI</span>
            <strong>COPILOT</strong>
            <small><i/> ONLINE • GARAGEM DIGITAL</small>
          </div>
          <button type="button" onClick={reset} title="Nova conversa"><RotateCcw size={16}/></button>
          <button type="button" onClick={()=>setOpen(false)} title="Fechar"><X size={18}/></button>
        </header>

        <div className="copilot-context-bar">
          <Sparkles size={13}/>
          <span>Escolhe carros usando anúncios reais do FULLSEND.</span>
        </div>

        <div className="copilot-messages" ref={scrollRef}>
          {messages.map(m=><div key={m.id} className={`copilot-message ${m.role}`}>
            <div className="copilot-bubble">
              {m.role==='assistant'?<span className="copilot-mini-label">COPILOT</span>:null}
              <p>{m.content}</p>
              {m.followUp?<small className="copilot-follow">{m.followUp}</small>:null}
            </div>

            {m.recommendations?.length?<div className="copilot-recommendations">
              {m.recommendations.map(x=><a
                key={x.id}
                className={`copilot-car ${x.vip?'vip':x.featured?'featured':''}`}
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
                  <small><MapPin size={11}/>{x.city||'Brasil'}{x.state?` / ${x.state}`:''}</small>
                  <em>VER ANÚNCIO <ExternalLink size={11}/></em>
                </div>
              </a>)}
            </div>:null}
          </div>)}

          {busy?<div className="copilot-message assistant">
            <div className="copilot-bubble copilot-thinking">
              <span className="copilot-mini-label">COPILOT</span>
              <div><i/><i/><i/></div>
              <small>Olhando a garagem...</small>
            </div>
          </div>:null}

          {error?<div className="copilot-error">{error}</div>:null}
        </div>

        {messages.length<=1?<div className="copilot-quick">
          {QUICK.map(q=><button key={q} onClick={()=>send(q)} disabled={busy}>
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
              placeholder="Ex.: quero um turbo manual até 80 mil..."
              rows={1}
            />
          </div>
          <button type="submit" disabled={busy||!input.trim()} aria-label="Enviar">
            <Send size={17}/>
          </button>
        </form>

        <footer className="copilot-foot">
          <span>IA pode errar. Confira anúncio, documentação e condição do veículo.</span>
        </footer>
      </aside>:null}
    </>
  )
}
