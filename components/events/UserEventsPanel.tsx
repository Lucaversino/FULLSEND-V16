'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Edit3, MapPin, Plus, Trash2 } from 'lucide-react'
import { EVENT_CATEGORIES } from '@/lib/events-shared'

type UserEvent={
  id:string
  slug:string
  title:string
  description?:string|null
  category:string
  event_date:string
  end_date?:string|null
  event_time?:string|null
  venue?:string|null
  address?:string|null
  google_maps_url?:string|null
  latitude?:number|null
  longitude?:number|null
  city?:string|null
  state?:string|null
  image_url?:string|null
  ticket_url?:string|null
  source_url?:string|null
  status:string
  featured?:boolean|null
  created_at?:string|null
}

const statusLabel:Record<string,string>={
  pending:'PENDENTE',
  published:'PUBLICADO',
  rejected:'REJEITADO',
}

export default function UserEventsPanel({events}:{events:UserEvent[]}){
  const [items,setItems]=useState(events)
  const [editing,setEditing]=useState<UserEvent|null>(null)
  const [busy,setBusy]=useState('')
  const [msg,setMsg]=useState('')

  const sorted=useMemo(
    ()=>[...items].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))),
    [items]
  )

  async function save(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    if(!editing)return

    setBusy(`save-${editing.id}`)
    setMsg('')

    const form=new FormData(e.currentTarget)
    const body={
      id:editing.id,
      title:String(form.get('title')||'').trim(),
      description:String(form.get('description')||'').trim(),
      category:String(form.get('category')||'Outros'),
      event_date:String(form.get('event_date')||''),
      end_date:String(form.get('end_date')||'')||null,
      event_time:String(form.get('event_time')||'')||null,
      venue:String(form.get('venue')||'').trim()||null,
      address:String(form.get('address')||'').trim()||null,
      google_maps_url:String(form.get('google_maps_url')||'').trim()||null,
      latitude:String(form.get('latitude')||'').trim()===''?null:Number(form.get('latitude')),
      longitude:String(form.get('longitude')||'').trim()===''?null:Number(form.get('longitude')),
      city:String(form.get('city')||'').trim()||null,
      state:String(form.get('state')||'').trim().toUpperCase().slice(0,2)||null,
      ticket_url:String(form.get('ticket_url')||'').trim()||null,
      source_url:String(form.get('source_url')||'').trim()||null,
    }

    const r=await fetch('/api/events/mine',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body),
    })
    const j=await r.json().catch(()=>({}))
    setBusy('')

    if(!r.ok){
      setMsg(j.error||'Não foi possível atualizar o evento.')
      return
    }

    setItems(v=>v.map(x=>x.id===editing.id?{...x,...j.event}:x))
    setEditing(null)
    setMsg('Evento atualizado. Ele voltou para PENDENTE para revisão do administrador.')
  }

  async function remove(event:UserEvent){
    if(!confirm(`Excluir o evento "${event.title}"? Essa ação não pode ser desfeita.`))return

    setBusy(`delete-${event.id}`)
    setMsg('')

    const r=await fetch('/api/events/mine',{
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:event.id}),
    })
    const j=await r.json().catch(()=>({}))
    setBusy('')

    if(!r.ok){
      setMsg(j.error||'Não foi possível excluir o evento.')
      return
    }

    setItems(v=>v.filter(x=>x.id!==event.id))
    setMsg('Evento excluído com sucesso.')
  }

  return <section className="profile-events-panel">
    <div className="profile-events-head">
      <div>
        <span>MINHA AGENDA</span>
        <h2>MEUS EVENTOS</h2>
      </div>
      <div className="profile-events-head-right">
        <small>{items.length} evento{items.length===1?'':'s'}</small>
        <Link href="/eventos/adicionar" className="profile-event-create"><Plus size={15}/> CRIAR EVENTO</Link>
      </div>
    </div>

    {msg?<div className="profile-events-message">{msg}</div>:null}

    {sorted.length===0?
      <div className="profile-events-empty">
        <CalendarDays size={28}/>
        <b>VOCÊ AINDA NÃO CRIOU EVENTOS</b>
        <span>Cadastre encontros, exposições, drift, track days e outros eventos automotivos.</span>
        <Link href="/eventos/adicionar">CRIAR PRIMEIRO EVENTO</Link>
      </div>
    :
      <div className="profile-events-grid">
        {sorted.map(event=><article className="profile-event-card" key={event.id}>
          <Link href={`/eventos/${event.slug}`} className="profile-event-image">
            {event.image_url?<img src={event.image_url} alt={event.title}/>:<div>FULLSEND<br/>EVENTOS</div>}
            <span className={`profile-event-status ${event.status}`}>{statusLabel[event.status]||event.status.toUpperCase()}</span>
          </Link>

          <div className="profile-event-info">
            <small>{event.category}</small>
            <h3>{event.title}</h3>
            <p><CalendarDays size={13}/>{event.event_date}{event.event_time?` • ${event.event_time.slice(0,5)}`:''}</p>
            <p><MapPin size={13}/>{event.city||'Cidade não informada'}{event.state?` / ${event.state}`:''}</p>
          </div>

          <div className="profile-event-actions">
            <button type="button" onClick={()=>setEditing(event)}><Edit3 size={14}/> EDITAR</button>
            <button type="button" className="danger" onClick={()=>remove(event)} disabled={busy===`delete-${event.id}`}>
              <Trash2 size={14}/>{busy===`delete-${event.id}`?' EXCLUINDO...':' EXCLUIR'}
            </button>
          </div>
        </article>)}
      </div>
    }

    {editing?<div className="profile-event-modal" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null)}}>
      <form className="profile-event-modal-card" onSubmit={save}>
        <div className="profile-event-modal-head">
          <div><span>GERENCIAR EVENTO</span><h3>EDITAR EVENTO</h3></div>
          <button type="button" onClick={()=>setEditing(null)} aria-label="Fechar">×</button>
        </div>

        <div className="profile-event-form-grid">
          <label className="wide">Título<input name="title" defaultValue={editing.title} required/></label>
          <label>Categoria<select name="category" defaultValue={editing.category}>{EVENT_CATEGORIES.filter(x=>x!=='Todos').map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Data<input type="date" name="event_date" defaultValue={editing.event_date} required/></label>
          <label>Data final<input type="date" name="end_date" defaultValue={editing.end_date||''}/></label>
          <label>Horário<input type="time" name="event_time" defaultValue={editing.event_time?.slice(0,5)||''}/></label>
          <label>Local<input name="venue" defaultValue={editing.venue||''}/></label>
          <div className="wide event-location-panel">
            <div className="event-location-head">
              <b>LOCALIZAÇÃO DO EVENTO</b>
              <span>Você pode informar endereço, link do Google Maps ou coordenadas. Todos esses campos são opcionais.</span>
            </div>
            <div className="event-location-grid">
              <label className="wide">Endereço do evento (opcional)<input name="address" defaultValue={editing.address||''}/></label>
              <label className="wide">Link do Google Maps (opcional)<input name="google_maps_url" type="url" defaultValue={editing.google_maps_url||''}/></label>
              <label>Cidade (opcional)<input name="city" defaultValue={editing.city||''}/></label>
              <label>UF (opcional)<input name="state" maxLength={2} defaultValue={editing.state||''}/></label>
            </div>
            <details className="event-coordinates-toggle" open={editing.latitude!=null||editing.longitude!=null}>
              <summary>Informar coordenadas manualmente</summary>
              <div className="event-coordinate-grid">
                <label>Latitude (opcional)<input name="latitude" type="number" step="any" defaultValue={editing.latitude??''}/></label>
                <label>Longitude (opcional)<input name="longitude" type="number" step="any" defaultValue={editing.longitude??''}/></label>
              </div>
            </details>
          </div>
          <label className="wide">Descrição<textarea name="description" rows={5} defaultValue={editing.description||''}/></label>
          <label className="wide">Link de ingressos<input name="ticket_url" defaultValue={editing.ticket_url||''}/></label>
          <label className="wide">Site / link oficial<input name="source_url" defaultValue={editing.source_url||''}/></label>
        </div>

        <div className="profile-event-review-note">
          Ao editar um evento publicado, ele volta para <b>PENDENTE</b> para nova revisão do administrador.
        </div>

        <div className="profile-event-modal-actions">
          <button type="button" className="ghost" onClick={()=>setEditing(null)}>CANCELAR</button>
          <button disabled={busy===`save-${editing.id}`}>{busy===`save-${editing.id}`?'SALVANDO...':'SALVAR ALTERAÇÕES'}</button>
        </div>
      </form>
    </div>:null}
  </section>
}
