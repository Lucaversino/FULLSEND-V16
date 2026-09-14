'use client'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ExternalLink, Image as ImageIcon, Plus, RefreshCw, Save, Search, Star, Trash2, XCircle } from 'lucide-react'
import { EVENT_CATEGORIES } from '@/lib/events'

type E={
  id:string;title:string;slug:string;description?:string|null;category:string;
  event_date:string;end_date?:string|null;event_time?:string|null;venue?:string|null;
  address?:string|null;city?:string|null;state?:string|null;country?:string|null;
  latitude?:number|null;longitude?:number|null;image_url?:string|null;ticket_url?:string|null;
  source_url?:string|null;source:string;status:'pending'|'published'|'rejected';featured:boolean;
}

const empty:Partial<E>={category:'Encontro',country:'BR',status:'published',featured:false,source:'fullsend'}

export default function AdminEvents(){
  const [events,setEvents]=useState<E[]>([])
  const [q,setQ]=useState('')
  const [status,setStatus]=useState('')
  const [busy,setBusy]=useState('')
  const [msg,setMsg]=useState('')
  const [editing,setEditing]=useState<Partial<E>|null>(null)
  const [importStatus,setImportStatus]=useState<'published'|'pending'>('published')
  const [importResult,setImportResult]=useState<any>(null)

  async function load(){
    setBusy('load')
    const qs=new URLSearchParams()
    if(q)qs.set('q',q)
    if(status)qs.set('status',status)
    const r=await fetch(`/api/admin/events?${qs}`,{cache:'no-store'})
    const j=await r.json()
    setBusy('')
    if(!r.ok){setMsg(j.error||'Erro ao carregar eventos.');return}
    setEvents(j.events||[])
  }

  useEffect(()=>{load()},[])

  const pending=useMemo(()=>events.filter(x=>x.status==='pending').length,[events])

  async function save(){
    if(!editing)return
    setBusy('save');setMsg('')
    const method=editing.id?'PATCH':'POST'
    const r=await fetch('/api/admin/events',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(editing)})
    const j=await r.json();setBusy('')
    if(!r.ok){setMsg(j.error||'Erro ao salvar evento.');return}
    setEvents(v=>editing.id?v.map(x=>x.id===j.event.id?j.event:x):[j.event,...v])
    setEditing(null);setMsg('Evento salvo.')
  }

  async function patchEvent(x:E,patch:Partial<E>){
    const next={...x,...patch}
    setBusy(`e-${x.id}`)
    const r=await fetch('/api/admin/events',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)})
    const j=await r.json();setBusy('')
    if(!r.ok){setMsg(j.error||'Erro ao atualizar evento.');return}
    setEvents(v=>v.map(i=>i.id===x.id?j.event:i));setMsg('Evento atualizado.')
  }

  async function remove(x:E){
    if(!confirm(`Excluir o evento “${x.title}”?`))return
    setBusy(`e-${x.id}`)
    const r=await fetch('/api/admin/events',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:x.id})})
    const j=await r.json();setBusy('')
    if(!r.ok){setMsg(j.error||'Erro ao excluir evento.');return}
    setEvents(v=>v.filter(i=>i.id!==x.id));setMsg('Evento excluído.')
  }

  async function importEvents(){
    setBusy('import');setMsg('Importando Ticketmaster...');setImportResult(null)
    const r=await fetch('/api/events/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:importStatus})})
    const j=await r.json();setBusy('');setImportResult(j)
    if(!r.ok){setMsg(j.errors?.join(' • ')||j.error||'Importação não configurada.');return}
    setMsg(`Importação concluída: ${j.found} encontrados • ${j.imported} novos • ${j.updated} atualizados.`)
    await load()
  }

  async function upload(file:File){
    setBusy('upload')
    const fd=new FormData();fd.set('file',file)
    const r=await fetch('/api/admin/events/upload',{method:'POST',body:fd})
    const j=await r.json();setBusy('')
    if(!r.ok){setMsg(j.error||'Erro no upload.');return}
    setEditing(v=>({...v,image_url:j.url}))
  }

  return <section className="admin-events-module">
    <div className="admin-events-toolbar">
      <div className="admin-events-search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar evento..."/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos status</option><option value="pending">Pendentes</option><option value="published">Publicados</option><option value="rejected">Rejeitados</option></select><button onClick={load}>BUSCAR</button></div>
      <button className="admin-event-new" onClick={()=>setEditing({...empty})}><Plus size={15}/> ADICIONAR EVENTO</button>
    </div>

    <div className="admin-events-import">
      <div><RefreshCw size={20}/><span><b>IMPORTAÇÃO TICKETMASTER</b><small>Backend seguro • TICKETMASTER_API_KEY nunca vai para o navegador.</small></span></div>
      <select value={importStatus} onChange={e=>setImportStatus(e.target.value as any)}><option value="published">Publicar automaticamente</option><option value="pending">Enviar para pendentes</option></select>
      <button onClick={importEvents} disabled={busy==='import'}>{busy==='import'?'IMPORTANDO...':'IMPORTAR EVENTOS'}</button>
    </div>

    {importResult?<div className="admin-event-import-result"><span>Encontrados <b>{importResult.found||0}</b></span><span>Importados <b>{importResult.imported||0}</b></span><span>Atualizados <b>{importResult.updated||0}</b></span><span>Já existiam <b>{importResult.existing||0}</b></span>{importResult.errors?.length?<em>{importResult.errors.join(' • ')}</em>:null}</div>:null}
    {msg?<div className="admin-toast">{msg}</div>:null}

    <div className="admin-events-summary"><span><CalendarDays/>TOTAL <b>{events.length}</b></span><span className="pending">PENDENTES <b>{pending}</b></span></div>

    <div className="admin-events-list">
      {events.map(x=><article className={`admin-event-row ${x.featured?'featured':''}`} key={x.id}>
        <div className="admin-event-thumb">{x.image_url?<img src={x.image_url} alt=""/>:<ImageIcon/>}</div>
        <div className="admin-event-copy"><span>{x.category} • {x.source.toUpperCase()}</span><h3>{x.title}</h3><p>{x.event_date}{x.event_time?` • ${x.event_time.slice(0,5)}`:''} • {x.city||'—'}{x.state?` / ${x.state}`:''}</p></div>
        <div className="admin-event-status"><b className={x.status}>{x.status.toUpperCase()}</b>{x.featured?<em><Star size={11}/>DESTAQUE</em>:null}</div>
        <div className="admin-event-actions">
          <button onClick={()=>setEditing(x)}>EDITAR</button>
          {x.status!=='published'?<button className="approve" onClick={()=>patchEvent(x,{status:'published'})}><Check size={14}/>APROVAR</button>:null}
          {x.status!=='rejected'?<button className="reject" onClick={()=>patchEvent(x,{status:'rejected'})}><XCircle size={14}/>REJEITAR</button>:null}
          <button className={x.featured?'featured':''} onClick={()=>patchEvent(x,{featured:!x.featured})}><Star size={14}/>{x.featured?'REMOVER DESTAQUE':'DESTACAR'}</button>
          {x.status==='published'?<a href={`/eventos/${x.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/></a>:null}
          <button className="delete" onClick={()=>remove(x)}><Trash2 size={14}/></button>
        </div>
      </article>)}
    </div>

    {editing?<div className="admin-event-modal-backdrop">
      <div className="admin-event-modal">
        <div className="admin-event-modal-head"><div><span>FULLSEND EVENTOS</span><h2>{editing.id?'EDITAR EVENTO':'NOVO EVENTO'}</h2></div><button onClick={()=>setEditing(null)}>×</button></div>
        <div className="admin-event-form-grid">
          <label className="wide">Nome<input value={editing.title||''} onChange={e=>setEditing({...editing,title:e.target.value})}/></label>
          <label>Categoria<select value={editing.category||'Encontro'} onChange={e=>setEditing({...editing,category:e.target.value})}>{EVENT_CATEGORIES.filter(x=>x!=='Todos').map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Status<select value={editing.status||'published'} onChange={e=>setEditing({...editing,status:e.target.value as any})}><option value="pending">Pendente</option><option value="published">Publicado</option><option value="rejected">Rejeitado</option></select></label>
          <label>Data<input type="date" value={editing.event_date||''} onChange={e=>setEditing({...editing,event_date:e.target.value})}/></label>
          <label>Horário<input type="time" value={editing.event_time?.slice(0,5)||''} onChange={e=>setEditing({...editing,event_time:e.target.value})}/></label>
          <label>Data final<input type="date" value={editing.end_date||''} onChange={e=>setEditing({...editing,end_date:e.target.value})}/></label>
          <label>Local<input value={editing.venue||''} onChange={e=>setEditing({...editing,venue:e.target.value})}/></label>
          <label className="wide">Endereço<input value={editing.address||''} onChange={e=>setEditing({...editing,address:e.target.value})}/></label>
          <label>Cidade<input value={editing.city||''} onChange={e=>setEditing({...editing,city:e.target.value})}/></label>
          <label>Estado<input maxLength={2} value={editing.state||''} onChange={e=>setEditing({...editing,state:e.target.value})}/></label>
          <label>País<input value={editing.country||'BR'} onChange={e=>setEditing({...editing,country:e.target.value})}/></label>
          <label>Latitude<input type="number" step="any" value={editing.latitude??''} onChange={e=>setEditing({...editing,latitude:e.target.value===''?null:Number(e.target.value)})}/></label>
          <label>Longitude<input type="number" step="any" value={editing.longitude??''} onChange={e=>setEditing({...editing,longitude:e.target.value===''?null:Number(e.target.value)})}/></label>
          <label className="wide">Descrição<textarea rows={5} value={editing.description||''} onChange={e=>setEditing({...editing,description:e.target.value})}/></label>
          <label className="wide">Imagem<input value={editing.image_url||''} onChange={e=>setEditing({...editing,image_url:e.target.value})}/><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)upload(f)}}/></label>
          <label>Link ingresso<input value={editing.ticket_url||''} onChange={e=>setEditing({...editing,ticket_url:e.target.value})}/></label>
          <label>Site oficial<input value={editing.source_url||''} onChange={e=>setEditing({...editing,source_url:e.target.value})}/></label>
          <label className="admin-event-featured-check"><input type="checkbox" checked={Boolean(editing.featured)} onChange={e=>setEditing({...editing,featured:e.target.checked})}/>Evento em destaque</label>
        </div>
        <div className="admin-event-modal-footer"><button onClick={()=>setEditing(null)}>CANCELAR</button><button className="save" onClick={save} disabled={busy==='save'}><Save size={15}/>{busy==='save'?'SALVANDO...':'SALVAR EVENTO'}</button></div>
      </div>
    </div>:null}
  </section>
}
