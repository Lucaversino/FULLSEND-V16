'use client'

import { useMemo, useState } from 'react'
import { Users, Car, Sparkles, Crown, ShieldCheck, Search, Save, Trash2, Gauge, ExternalLink, Database, BadgeCheck, Megaphone, BrainCircuit, ScanSearch, CheckCircle2, XCircle, Radar, Play, Power, MapPin, RefreshCw, Clock3, Plus, Activity, CalendarDays } from 'lucide-react'
import UserBadge from '@/components/UserBadge'
import AdminAnalytics from '@/components/admin/AdminAnalytics'
import AdminPromotions from '@/components/admin/AdminPromotions'
import AdminEvents from '@/components/admin/AdminEvents'

type AdminUser={id:string;email:string;created_at?:string;name?:string;city?:string;state?:string;whatsapp?:string;badge?:string;role?:string;account_status?:string;avatar_url?:string;last_admin_note?:string}
type AdminListing={id:string;kind:'fullsend'|'gecko';title:string;price:number|null;status:string;city?:string|null;state?:string|null;source?:string;is_featured?:boolean;is_vip?:boolean;admin_note?:string;external_url?:string|null;created_at?:string|null;user_id?:string|null;ai_rebaixado?:boolean|null;ai_roda_grande?:boolean|null;ai_stance?:boolean|null;ai_style_score?:number|null;ai_confidence?:number|null;ai_reason?:string|null;ai_analyzed_at?:string|null;ai_manual_rebaixado?:boolean|null;image_url?:string|null}
type AuditLog={id:number|string;action:string;entity?:string|null;entity_id?:string|null;created_at?:string|null}
type Tab='overview'|'listings'|'promoted'|'payments'|'ai'|'imports'|'visitors'|'events'|'users'
type PromoFilter='all'|'featured'|'vip'

const IMPORT_CATEGORIES=[
  {value:'vehicles',label:'Veículos'},
  {value:'audio',label:'Som Automotivo'},
  {value:'engine_parts',label:'Motor e Peças'},
  {value:'wheels_tires',label:'Rodas e Pneus'},
  {value:'suspension',label:'Suspensão'},
  {value:'accessories',label:'Acessórios'},
  {value:'performance',label:'Performance / Turbo'},
]
function importCategoryLabel(v?:string|null){return IMPORT_CATEGORIES.find(x=>x.value===v)?.label||'Veículos'}

type ImportJob={id:string;name?:string|null;keyword:string;search_category?:string|null;location_mode?:'exact'|'region'|'state'|'any';city?:string|null;state?:string|null;pages:number;enabled:boolean;frequency:string;run_ai_after_import?:boolean;last_run_at?:string|null;last_status?:string|null;last_received?:number;last_imported?:number;last_error?:string|null;created_at?:string|null}
type ImportLog={id:number|string;job_id?:string|null;keyword?:string|null;search_category?:string|null;location_mode?:string|null;city?:string|null;state?:string|null;trigger_source:string;started_at?:string|null;finished_at?:string|null;status:string;received:number;imported:number;pages_processed:number;error?:string|null}
type ImportPreview={jobId:string;received:number;accepted:number;locationRejected:number;acceptedPreview:any[];rejectedPreview:any[];locationMode:string}

function money(v:number|null){return v==null?'—':v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}

export default function AdminDashboard({users:initialUsers,listings:initialListings,logs=[],importJobs:initialImportJobs=[],importLogs:initialImportLogs=[],promotions=[]}:{users:AdminUser[];listings:AdminListing[];logs?:AuditLog[];importJobs?:ImportJob[];importLogs?:ImportLog[];promotions?:any[]}){
  const [tab,setTab]=useState<Tab>('overview')
  const [promoFilter,setPromoFilter]=useState<PromoFilter>('all')
  const [users,setUsers]=useState(initialUsers)
  const [listings,setListings]=useState(initialListings)
  const [q,setQ]=useState('')
  const [busy,setBusy]=useState('')
  const [msg,setMsg]=useState('')
  const [importJobs,setImportJobs]=useState<ImportJob[]>(initialImportJobs)
  const [importLogs,setImportLogs]=useState<ImportLog[]>(initialImportLogs)
  const [newImport,setNewImport]=useState({name:'',keyword:'',search_category:'vehicles',location_mode:'exact' as 'exact'|'region'|'state'|'any',city:'',state:'SC',pages:1,enabled:false})
  const [importPreview,setImportPreview]=useState<ImportPreview|null>(null)

  const filteredListings=useMemo(()=>{const s=q.toLowerCase().trim();return !s?listings:listings.filter(x=>[x.title,x.city,x.state,x.kind].filter(Boolean).join(' ').toLowerCase().includes(s))},[listings,q])
  const filteredUsers=useMemo(()=>{const s=q.toLowerCase().trim();return !s?users:users.filter(x=>[x.name,x.email,x.city,x.state,x.badge].filter(Boolean).join(' ').toLowerCase().includes(s))},[users,q])
  const promotedListings=useMemo(()=>{
    const s=q.toLowerCase().trim()
    return listings.filter(x=>{
      if(!(x.is_featured||x.is_vip))return false
      if(promoFilter==='featured'&&!x.is_featured)return false
      if(promoFilter==='vip'&&!x.is_vip)return false
      if(!s)return true
      return [x.title,x.city,x.state,x.kind].filter(Boolean).join(' ').toLowerCase().includes(s)
    })
  },[listings,q,promoFilter])

  const aiListings=useMemo(()=>listings.filter(x=>x.kind==='gecko'),[listings])
  const aiFiltered=useMemo(()=>{const s=q.toLowerCase().trim();return !s?aiListings:aiListings.filter(x=>[x.title,x.city,x.state,x.ai_reason].filter(Boolean).join(' ').toLowerCase().includes(s))},[aiListings,q])
  const stats={users:users.length,listings:listings.length,featured:listings.filter(x=>x.is_featured).length,vip:listings.filter(x=>x.is_vip).length,promoted:listings.filter(x=>x.is_featured||x.is_vip).length,partners:listings.filter(x=>x.kind==='gecko').length,aiAnalyzed:aiListings.filter(x=>x.ai_analyzed_at).length,aiLowered:aiListings.filter(x=>x.ai_manual_rebaixado===true||(x.ai_manual_rebaixado==null&&x.ai_rebaixado===true)).length,aiPending:aiListings.filter(x=>!x.ai_analyzed_at).length}

  async function updateUser(u:AdminUser){
    setBusy(`u-${u.id}`);setMsg('')
    const r=await fetch('/api/admin/users',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(u)})
    const j=await r.json();setBusy('');setMsg(r.ok?'Usuário atualizado.':j.error||'Erro ao atualizar usuário.')
  }
  async function deleteUser(u:AdminUser){
    if(!confirm(`Excluir definitivamente ${u.name||u.email}? Os anúncios desse usuário também poderão ser removidos.`))return
    setBusy(`u-${u.id}`);const r=await fetch('/api/admin/users',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:u.id})});const j=await r.json();setBusy('');if(r.ok){setUsers(v=>v.filter(x=>x.id!==u.id));setMsg('Usuário excluído.')}else setMsg(j.error||'Erro ao excluir.')
  }
  async function updateListing(x:AdminListing){
    setBusy(`l-${x.kind}-${x.id}`);setMsg('')
    const r=await fetch('/api/admin/listings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(x)})
    const j=await r.json();setBusy('');setMsg(r.ok?'Anúncio atualizado.':j.error||'Erro ao atualizar anúncio.')
  }
  async function setPromotion(x:AdminListing,key:'is_featured'|'is_vip',value:boolean){
    const updated={...x,[key]:value}
    setBusy(`p-${key}-${x.kind}-${x.id}`);setMsg('')
    const r=await fetch('/api/admin/listings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)})
    const j=await r.json();setBusy('')
    if(r.ok){
      setListings(v=>v.map(a=>a.id===x.id&&a.kind===x.kind?updated:a))
      setMsg(value?(key==='is_vip'?'VIP ativado. O anúncio entrou na seleção do carrossel.':'Destaque ativado. O anúncio entrou na seleção do carrossel.'):(key==='is_vip'?'VIP removido.':'Destaque removido.'))
    }else setMsg(j.error||'Erro ao atualizar promoção.')
  }
  async function deleteListing(x:AdminListing){
    if(!confirm(`Excluir definitivamente o anúncio “${x.title}”?`))return
    setBusy(`l-${x.kind}-${x.id}`);const r=await fetch('/api/admin/listings',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:x.id,kind:x.kind})});const j=await r.json();setBusy('');if(r.ok){setListings(v=>v.filter(a=>!(a.id===x.id&&a.kind===x.kind)));setMsg('Anúncio excluído.')}else setMsg(j.error||'Erro ao excluir.')
  }

  async function analyzeAiBatch(){
    setBusy('ai-batch');setMsg('Analisando até 4 anúncios com IA...')
    const r=await fetch('/api/admin/ai-style',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({limit:4})})
    const j=await r.json();setBusy('')
    if(!r.ok){setMsg(j.error||'Erro na análise por IA.');return}
    if(Array.isArray(j.results)){
      setListings(v=>v.map(x=>{
        const found=j.results.find((a:any)=>a.id===x.id)
        return found?{...x,ai_rebaixado:found.rebaixado,ai_roda_grande:found.roda_grande,ai_stance:found.stance,ai_style_score:found.score,ai_confidence:found.confidence,ai_reason:found.reason,ai_analyzed_at:new Date().toISOString()}:x
      }))
    }
    setMsg(`${j.analyzed||0} anúncio(s) analisado(s) pela IA.`)
  }

  async function analyzeAiOne(x:AdminListing){
    setBusy(`ai-${x.id}`);setMsg('')
    const r=await fetch('/api/admin/ai-style',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:x.id})})
    const j=await r.json();setBusy('')
    if(!r.ok){setMsg(j.error||'Erro na análise por IA.');return}
    const a=j.results?.[0]
    if(a)setListings(v=>v.map(i=>i.id===x.id&&i.kind==='gecko'?{...i,ai_rebaixado:a.rebaixado,ai_roda_grande:a.roda_grande,ai_stance:a.stance,ai_style_score:a.score,ai_confidence:a.confidence,ai_reason:a.reason,ai_analyzed_at:new Date().toISOString()}:i))
    setMsg('Anúncio analisado pela IA.')
  }

  async function setAiOverride(x:AdminListing,mode:'auto'|'yes'|'no'){
    setBusy(`aio-${x.id}`);setMsg('')
    const r=await fetch('/api/admin/ai-style',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:x.id,mode})})
    const j=await r.json();setBusy('')
    if(!r.ok){setMsg(j.error||'Erro ao salvar correção.');return}
    setListings(v=>v.map(i=>i.id===x.id&&i.kind==='gecko'?{...i,ai_manual_rebaixado:j.ai_manual_rebaixado}:i))
    setMsg('Classificação manual atualizada.')
  }


  async function createImportJob(){
    if(!newImport.keyword.trim()){setMsg('Informe o carro ou termo da pesquisa.');return}
    setBusy('import-create');setMsg('')
    const r=await fetch('/api/admin/import-jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newImport)})
    const j=await r.json();setBusy('')
    if(!r.ok){setMsg(j.error||'Erro ao criar busca.');return}
    setImportJobs(v=>[j.job,...v])
    setNewImport({name:'',keyword:'',search_category:'vehicles',location_mode:'exact',city:'',state:'SC',pages:1,enabled:false})
    setMsg('Busca criada com sucesso.')
  }

  async function updateImportJob(job:ImportJob,patch:Partial<ImportJob>){
    const optimistic={...job,...patch}
    setImportJobs(v=>v.map(x=>x.id===job.id?optimistic:x))
    setBusy(`ij-${job.id}`);setMsg('')
    const r=await fetch('/api/admin/import-jobs',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:job.id,...patch})})
    const j=await r.json();setBusy('')
    if(!r.ok){setImportJobs(v=>v.map(x=>x.id===job.id?job:x));setMsg(j.error||'Erro ao atualizar busca.');return}
    setImportJobs(v=>v.map(x=>x.id===job.id?j.job:x))
    setMsg(patch.enabled===true?'Automação diária LIGADA.':patch.enabled===false?'Automação DESLIGADA.':'Busca atualizada.')
  }

  async function previewImportJob(job:ImportJob){
    setBusy(`preview-${job.id}`);setMsg(`Pré-visualizando ${job.keyword}...`);setImportPreview(null)
    const r=await fetch('/api/admin/import-jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'preview',id:job.id})})
    const j=await r.json();setBusy('')
    if(!r.ok){setMsg(j.error||'Erro ao pré-visualizar busca.');return}
    const result=j.result
    setImportPreview({jobId:job.id,received:result.received,accepted:result.accepted,locationRejected:result.locationRejected,acceptedPreview:result.acceptedPreview||[],rejectedPreview:result.rejectedPreview||[],locationMode:result.locationMode})
    setMsg(`Prévia concluída: ${result.received} recebidos • ${result.accepted} aceitos • ${result.locationRejected} rejeitados.`)
  }

  async function runImportJob(job:ImportJob){
    setBusy(`run-${job.id}`);setMsg(`Buscando ${job.keyword}${job.city?` em ${job.city}`:''}...`)
    const r=await fetch('/api/admin/import-jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'run',id:job.id})})
    const j=await r.json();setBusy('')
    if(!r.ok){setMsg(j.error||'Erro ao executar busca.');return}
    const result=j.result
    setImportJobs(v=>v.map(x=>x.id===job.id?{...x,last_run_at:new Date().toISOString(),last_status:'success',last_received:result.received,last_imported:result.imported,last_error:null}:x))
    setImportPreview(null)
    setMsg(`Busca concluída: ${result.received} recebidos • ${result.accepted??result.imported} aceitos • ${result.imported} importados • ${result.locationRejected??0} rejeitados.`)
    const refresh=await fetch('/api/admin/import-jobs')
    if(refresh.ok){const data=await refresh.json();setImportLogs(data.logs||[])}
  }

  async function deleteImportJob(job:ImportJob){
    if(!confirm(`Excluir a busca “${job.name||job.keyword}”?`))return
    setBusy(`del-${job.id}`)
    const r=await fetch('/api/admin/import-jobs',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:job.id})})
    const j=await r.json();setBusy('')
    if(!r.ok){setMsg(j.error||'Erro ao excluir busca.');return}
    setImportJobs(v=>v.filter(x=>x.id!==job.id));setMsg('Busca excluída.')
  }

  function patchUser(id:string,key:keyof AdminUser,value:any){setUsers(v=>v.map(x=>x.id===id?{...x,[key]:value}:x))}
  function patchListing(id:string,kind:string,key:keyof AdminListing,value:any){setListings(v=>v.map(x=>x.id===id&&x.kind===kind?{...x,[key]:value}:x))}

  const pageTitle=tab==='overview'?'CENTRAL DE CONTROLE':tab==='listings'?'GERENCIAR ANÚNCIOS':tab==='promoted'?'DESTAQUES & VIP':tab==='payments'?'IMPULSIONAMENTOS / PIX':tab==='ai'?'IA DE ESTILO AUTOMOTIVO':tab==='imports'?'BUSCAS AUTOMÁTICAS':tab==='visitors'?'VISITANTES & IA':tab==='events'?'EVENTOS AUTOMOTIVOS':'GERENCIAR USUÁRIOS'

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span>FULLSEND</span><small>CONTROL CENTER</small></div>
      <nav>
        <button className={tab==='overview'?'active':''} onClick={()=>{setTab('overview');setQ('')}}><Gauge size={18}/> VISÃO GERAL</button>
        <button className={tab==='listings'?'active':''} onClick={()=>{setTab('listings');setQ('')}}><Car size={18}/> ANÚNCIOS <b>{stats.listings}</b></button>
        <button className={tab==='promoted'?'active':''} onClick={()=>{setTab('promoted');setQ('')}}><Megaphone size={18}/> DESTAQUE / VIP <b>{stats.promoted}</b></button>
        <button className={tab==='payments'?'active':''} onClick={()=>{setTab('payments');setQ('')}}><BadgeCheck size={18}/> IMPULSIONAMENTOS <b>{promotions.length}</b></button>
        <button className={tab==='ai'?'active':''} onClick={()=>{setTab('ai');setQ('')}}><BrainCircuit size={18}/> IA REBAIXADOS <b>{stats.aiPending}</b></button>
        <button className={tab==='imports'?'active':''} onClick={()=>{setTab('imports');setQ('')}}><Radar size={18}/> BUSCAS AUTO <b>{importJobs.filter(x=>x.enabled).length}</b></button>
        <button className={tab==='visitors'?'active':''} onClick={()=>{setTab('visitors');setQ('')}}><Activity size={18}/> VISITANTES</button>
        <button className={tab==='events'?'active':''} onClick={()=>{setTab('events');setQ('')}}><CalendarDays size={18}/> EVENTOS</button>
        <button className={tab==='users'?'active':''} onClick={()=>{setTab('users');setQ('')}}><Users size={18}/> USUÁRIOS <b>{stats.users}</b></button>
      </nav>
      <div className="admin-security"><ShieldCheck size={18}/><div><strong>ÁREA PROTEGIDA</strong><span>Ações administrativas são registradas.</span></div></div>
    </aside>

    <main className="admin-main">
      <header className="admin-topbar"><div><span className="section-kicker">PAINEL ADMINISTRATIVO</span><h1>{pageTitle}</h1></div>{tab!=='overview'&&tab!=='visitors'&&tab!=='payments'&&tab!=='events'?<div className="admin-search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={tab==='users'?'Buscar usuário...':'Buscar anúncio...'}/></div>:null}</header>
      {msg?<div className="admin-toast">{msg}</div>:null}

      {tab==='overview'?<>
        <section className="admin-stat-grid">
          <button onClick={()=>setTab('users')} className="admin-stat"><Users/><span>USUÁRIOS</span><strong>{stats.users}</strong><small>contas cadastradas</small></button>
          <button onClick={()=>setTab('listings')} className="admin-stat"><Car/><span>ANÚNCIOS</span><strong>{stats.listings}</strong><small>FULLSEND + parceiros</small></button>
          <button onClick={()=>{setPromoFilter('featured');setTab('promoted')}} className="admin-stat hot"><Sparkles/><span>DESTAQUES</span><strong>{stats.featured}</strong><small>pagos ou ativados pelo administrador</small></button>
          <button onClick={()=>{setPromoFilter('vip');setTab('promoted')}} className="admin-stat vip"><Crown/><span>VIP</span><strong>{stats.vip}</strong><small>pagos ou ativados pelo administrador</small></button>
        </section>
        <section className="admin-ai-overview" onClick={()=>setTab('ai')}>
          <BrainCircuit size={22}/><div><span>IA DE ESTILO</span><strong>{stats.aiLowered} rebaixados identificados</strong><small>{stats.aiAnalyzed} analisados • {stats.aiPending} pendentes</small></div>
        </section>
        <section className="admin-import-overview" onClick={()=>setTab('imports')}>
          <Radar size={22}/><div><span>BUSCAS AUTOMÁTICAS</span><strong>{importJobs.filter(x=>x.enabled).length} pesquisa(s) ligada(s)</strong><small>Execução diária + retry automático da Gecko</small></div>
        </section>
        <section className="admin-visitor-overview" onClick={()=>setTab('visitors')}>
          <Activity size={22}/><div><span>VISITANTES & IA</span><strong>Analytics próprio do FULLSEND</strong><small>visitantes, tempo ativo, páginas e análise estratégica</small></div>
        </section>
        <section className="admin-panel-grid">
          <div className="admin-card"><h3><Database size={18}/> ECOSSISTEMA DE ANÚNCIOS</h3><div className="admin-progress-row"><span>Importados Gecko/OLX</span><b>{stats.partners}</b></div><div className="admin-progress-row"><span>Publicados por membros</span><b>{stats.listings - stats.partners}</b></div><p>Somente anúncios que você marcar como DESTAQUE ou VIP entram no carrossel da página inicial.</p></div>
          <div className="admin-card"><h3><BadgeCheck size={18}/> IDENTIFICAÇÃO DE USUÁRIOS</h3><div className="badge-showcase"><UserBadge badge="admin"/></div><p>Usuários comuns não possuem selo. O selo ADM é reservado às contas administrativas.</p></div>
        </section>
        <section className="admin-card admin-audit"><h3><ShieldCheck size={18}/> ATIVIDADE ADMINISTRATIVA RECENTE</h3>{logs.length?<div className="audit-list">{logs.slice(0,8).map((log:AuditLog)=><div key={String(log.id)}><span>{log.action.replaceAll('_',' ').toUpperCase()}</span><small>{log.entity||'sistema'} • {log.created_at?new Date(log.created_at).toLocaleString('pt-BR'):'agora'}</small></div>)}</div>:<p>Nenhuma ação administrativa registrada ainda.</p>}</section>
      </>:null}

      {tab==='listings'?<section className="admin-table-wrap">
        <div className="admin-table-head"><span>{filteredListings.length} anúncios</span><small>Marque DESTAQUE/VIP e clique SALVAR. Apenas os marcados entram no carrossel.</small></div>
        <div className="admin-list-stack">{filteredListings.map(x=><article key={`${x.kind}-${x.id}`} className={`admin-listing-row ${x.is_vip?'row-vip':''} ${x.is_featured?'row-featured':''}`}>
          <div className="admin-listing-thumb">
            {x.image_url
              ? <img
                  src={x.kind==='gecko'?`/api/image?url=${encodeURIComponent(x.image_url)}`:x.image_url}
                  alt={x.title}
                  loading="lazy"
                />
              : <div className="admin-listing-thumb-empty"><Car size={22}/><span>SEM FOTO</span></div>}
          </div>
          <div className="admin-listing-main"><div className="admin-origin">{x.kind==='gecko'?'PARCEIRO':'FULLSEND'}</div><input className="admin-inline-title" value={x.title} onChange={e=>patchListing(x.id,x.kind,'title',e.target.value)}/><div className="admin-row-meta"><span>{x.city||'—'}{x.state?` / ${x.state}`:''}</span><span>{money(x.price)}</span><span>{x.status}</span></div></div>
          <div className="admin-listing-controls"><label>Preço<input type="number" value={x.price??''} onChange={e=>patchListing(x.id,x.kind,'price',e.target.value===''?null:Number(e.target.value))}/></label><label>Status<select value={x.status} onChange={e=>patchListing(x.id,x.kind,'status',e.target.value)}>{x.kind==='fullsend'?<><option value="active">Ativo</option><option value="pending">Pendente</option><option value="sold">Vendido</option><option value="blocked">Bloqueado</option><option value="draft">Rascunho</option></>:<><option value="active">Ativo</option><option value="inactive">Inativo</option><option value="blocked">Bloqueado</option></>}</select></label>
            <label className="admin-toggle"><input type="checkbox" checked={!!x.is_featured} onChange={e=>patchListing(x.id,x.kind,'is_featured',e.target.checked)}/><span><Sparkles size={14}/> DESTAQUE</span></label>
            <label className="admin-toggle vip"><input type="checkbox" checked={!!x.is_vip} onChange={e=>patchListing(x.id,x.kind,'is_vip',e.target.checked)}/><span><Crown size={14}/> VIP</span></label>
            <input className="admin-note" value={x.admin_note||''} onChange={e=>patchListing(x.id,x.kind,'admin_note',e.target.value)} placeholder="Nota interna do ADM"/>
            <div className="admin-actions"><button onClick={()=>updateListing(x)} disabled={busy===`l-${x.kind}-${x.id}`} className="admin-save"><Save size={15}/> SALVAR</button>{x.external_url?<a href={x.external_url} target="_blank" rel="noreferrer" className="admin-open"><ExternalLink size={15}/></a>:null}<button onClick={()=>deleteListing(x)} className="admin-delete"><Trash2 size={15}/></button></div>
          </div>
        </article>)}</div>
      </section>:null}

      {tab==='promoted'?<section className="admin-promo-control">
        <div className="admin-promo-summary">
          <div><Megaphone size={22}/><span>NO CARROSSEL</span><strong>{stats.promoted}</strong><small>anúncios marcados</small></div>
          <div className="featured"><Sparkles size={22}/><span>DESTAQUE</span><strong>{stats.featured}</strong><small>cards vermelhos</small></div>
          <div className="vip"><Crown size={22}/><span>VIP</span><strong>{stats.vip}</strong><small>cards dourados</small></div>
        </div>
        <div className="admin-promo-toolbar">
          <div><strong>CONTROLE DO CARROSSEL</strong><span>O site sorteia até 10 por carregamento somente entre estes anúncios.</span></div>
          <div className="admin-promo-filters">
            <button className={promoFilter==='all'?'active':''} onClick={()=>setPromoFilter('all')}>TODOS ({stats.promoted})</button>
            <button className={promoFilter==='featured'?'active red':''} onClick={()=>setPromoFilter('featured')}>DESTAQUE ({stats.featured})</button>
            <button className={promoFilter==='vip'?'active gold':''} onClick={()=>setPromoFilter('vip')}>VIP ({stats.vip})</button>
          </div>
        </div>
        {promotedListings.length?<div className="admin-promo-grid">{promotedListings.map(x=><article key={`promo-${x.kind}-${x.id}`} className={`admin-promo-card ${x.is_vip?'vip':''} ${x.is_featured?'featured':''}`}>
          <div className="admin-promo-card-top"><div><span className="admin-origin">{x.kind==='gecko'?'PARCEIRO':'FULLSEND'}</span><h3>{x.title}</h3><p>{x.city||'—'}{x.state?` / ${x.state}`:''} • {money(x.price)}</p></div><div className="admin-promo-badges">{x.is_featured?<span className="featured"><Sparkles size={12}/> DESTAQUE</span>:null}{x.is_vip?<span className="vip"><Crown size={12}/> VIP</span>:null}</div></div>
          <div className="admin-promo-actions">
            <button className={`promo-action featured ${x.is_featured?'on':''}`} disabled={busy===`p-is_featured-${x.kind}-${x.id}`} onClick={()=>setPromotion(x,'is_featured',!x.is_featured)}><Sparkles size={15}/>{x.is_featured?'REMOVER DESTAQUE':'ATIVAR DESTAQUE'}</button>
            <button className={`promo-action vip ${x.is_vip?'on':''}`} disabled={busy===`p-is_vip-${x.kind}-${x.id}`} onClick={()=>setPromotion(x,'is_vip',!x.is_vip)}><Crown size={15}/>{x.is_vip?'REMOVER VIP':'ATIVAR VIP'}</button>
            {x.external_url?<a href={x.external_url} target="_blank" rel="noreferrer" className="admin-open"><ExternalLink size={15}/> ABRIR</a>:null}
          </div>
        </article>)}</div>:<div className="admin-promo-empty"><Megaphone size={32}/><h3>NENHUM ANÚNCIO NESTA SELEÇÃO</h3><p>Vá em ANÚNCIOS, marque DESTAQUE ou VIP e salve. Só então ele poderá aparecer no carrossel da home.</p><button className="btn btn-red" onClick={()=>setTab('listings')}>GERENCIAR ANÚNCIOS</button></div>}
      </section>:null}


      {tab==='payments'?<AdminPromotions initialPromotions={promotions} fullsendListings={listings.filter(x=>x.kind==='fullsend')}/>:null}

      {tab==='ai'?<section className="admin-ai-control">
        <div className="admin-ai-hero">
          <div><BrainCircuit size={28}/><div><span>FULLSEND VISION</span><h2>CLASSIFICAÇÃO DE REBAIXADOS</h2><p>A IA analisa foto + título + descrição do anúncio e salva o resultado no Supabase.</p></div></div>
          <button className="btn btn-red" onClick={analyzeAiBatch} disabled={busy==='ai-batch'}><ScanSearch size={17}/>{busy==='ai-batch'?' ANALISANDO...':' ANALISAR 4 PENDENTES'}</button>
        </div>
        <div className="admin-promo-summary ai-summary">
          <div><Database size={20}/><span>IMPORTADOS</span><strong>{aiListings.length}</strong><small>Gecko/OLX</small></div>
          <div><BrainCircuit size={20}/><span>ANALISADOS</span><strong>{stats.aiAnalyzed}</strong><small>pela IA</small></div>
          <div className="featured"><CheckCircle2 size={20}/><span>REBAIXADOS</span><strong>{stats.aiLowered}</strong><small>entram no filtro</small></div>
        </div>
        <div className="admin-ai-note">A correção manual sempre vence a IA. Use SIM/NÃO quando quiser ajustar algum anúncio.</div>
        <div className="admin-ai-grid">{aiFiltered.map(x=>{
          const effective=x.ai_manual_rebaixado===true?true:x.ai_manual_rebaixado===false?false:x.ai_rebaixado===true
          return <article key={`ai-${x.id}`} className={`admin-ai-card ${effective?'lowered':''}`}>
            <div className="admin-ai-thumb">{x.image_url?<img src={`/api/image?url=${encodeURIComponent(x.image_url)}`} alt=""/>:<Car size={28}/>}</div>
            <div className="admin-ai-body">
              <div className="admin-ai-title"><h3>{x.title}</h3>{effective?<span className="ai-yes"><CheckCircle2 size={12}/> REBAIXADO</span>:x.ai_analyzed_at?<span className="ai-no"><XCircle size={12}/> NÃO</span>:<span className="ai-pending">PENDENTE</span>}</div>
              <p>{x.city||'—'}{x.state?` / ${x.state}`:''} • {money(x.price)}</p>
              {x.ai_analyzed_at?<div className="admin-ai-result"><span>Score <b>{x.ai_style_score??0}/100</b></span><span>Confiança <b>{Math.round((Number(x.ai_confidence)||0)*100)}%</b></span><span>Roda grande <b>{x.ai_roda_grande?'SIM':'NÃO'}</b></span><span>Stance <b>{x.ai_stance?'SIM':'NÃO'}</b></span></div>:null}
              {x.ai_reason?<div className="admin-ai-reason">{x.ai_reason}</div>:null}
              <div className="admin-ai-actions">
                <button onClick={()=>analyzeAiOne(x)} disabled={busy===`ai-${x.id}`}><BrainCircuit size={14}/>{x.ai_analyzed_at?' REANALISAR':' ANALISAR'}</button>
                <button className={x.ai_manual_rebaixado===true?'active yes':''} onClick={()=>setAiOverride(x,'yes')} disabled={busy===`aio-${x.id}`}>FORÇAR SIM</button>
                <button className={x.ai_manual_rebaixado===false?'active no':''} onClick={()=>setAiOverride(x,'no')} disabled={busy===`aio-${x.id}`}>FORÇAR NÃO</button>
                <button className={x.ai_manual_rebaixado==null?'active':''} onClick={()=>setAiOverride(x,'auto')} disabled={busy===`aio-${x.id}`}>AUTO IA</button>
              </div>
            </div>
          </article>
        })}</div>
      </section>:null}


      {tab==='imports'?<section className="admin-import-control">
        <div className="admin-import-hero">
          <div><Radar size={30}/><div><span>FULLSEND DISCOVERY</span><h2>IMPORTAÇÃO PROGRAMADA</h2><p>Cadastre a categoria, produto/termo, cidade e estado. Execute agora ou deixe ligado para pesquisar automaticamente uma vez por dia.</p></div></div>
          <div className="admin-import-cron"><Clock3 size={17}/><div><b>ROTINA DIÁRIA</b><small>aprox. 06:00 horário de Brasília</small></div></div>
        </div>

        <div className="admin-import-create">
          <div className="admin-import-field wide"><label>NOME DA BUSCA</label><input value={newImport.name} onChange={e=>setNewImport(v=>({...v,name:e.target.value}))} placeholder="Ex.: Subwoofer Porto Belo"/></div>
          <div className="admin-import-field"><label>CATEGORIA</label><select value={newImport.search_category} onChange={e=>setNewImport(v=>({...v,search_category:e.target.value}))}>{IMPORT_CATEGORIES.map(cat=><option key={cat.value} value={cat.value}>{cat.label}</option>)}</select></div>
          <div className="admin-import-field"><label>LOCALIZAÇÃO</label><select value={newImport.location_mode} onChange={e=>setNewImport(v=>({...v,location_mode:e.target.value as any}))}><option value="exact">Cidade exata</option><option value="region">Cidade + região próxima</option><option value="state">Todo o estado</option><option value="any">Não filtrar localização</option></select></div>
          <div className="admin-import-field wide"><label>PRODUTO / TERMO</label><input value={newImport.keyword} onChange={e=>setNewImport(v=>({...v,keyword:e.target.value}))} placeholder="Chevette, subwoofer, motor AP, aro 18..."/></div>
          <div className="admin-import-field"><label>CIDADE</label><input value={newImport.city} onChange={e=>setNewImport(v=>({...v,city:e.target.value}))} placeholder="Porto Belo"/></div>
          <div className="admin-import-field tiny"><label>UF</label><input maxLength={2} value={newImport.state} onChange={e=>setNewImport(v=>({...v,state:e.target.value.toUpperCase()}))} placeholder="SC"/></div>
          <div className="admin-import-field tiny"><label>PÁGINAS</label><select value={newImport.pages} onChange={e=>setNewImport(v=>({...v,pages:Number(e.target.value)}))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
          <label className="admin-import-switch"><input type="checkbox" checked={newImport.enabled} onChange={e=>setNewImport(v=>({...v,enabled:e.target.checked}))}/><span/><div><b>AUTOMATIZAR</b><small>1x por dia</small></div></label>
          <button className="btn btn-red" onClick={createImportJob} disabled={busy==='import-create'}><Plus size={17}/>{busy==='import-create'?' SALVANDO...':' CRIAR BUSCA'}</button>
        </div>

        <div className="admin-import-info"><ShieldCheck size={16}/><div><b>CONTROLE PROFISSIONAL</b><span>Use PRÉ-VISUALIZAR para ver aceitos e rejeitados antes de importar. Você escolhe cidade exata, região próxima, todo o estado ou sem filtro. Erros 504/502/429 têm até 3 tentativas.</span></div></div>

        <div className="admin-import-jobs">
          {importJobs.length?importJobs.map(job=><article key={job.id} className={`admin-import-job ${job.enabled?'enabled':''}`}>
            <div className="admin-import-job-main">
              <div className="admin-import-job-icon"><Radar size={21}/></div>
              <div className="admin-import-job-title"><span>{job.enabled?'AUTOMÁTICO LIGADO':'AUTOMÁTICO DESLIGADO'}</span><h3>{job.name||job.keyword}</h3><p><b>{importCategoryLabel(job.search_category)}</b> • {job.keyword}{job.city?<> • <MapPin size={11}/>{job.city}{job.state?`/${job.state}`:''}</>:null} • {job.location_mode==='region'?'REGIÃO':job.location_mode==='state'?'ESTADO':job.location_mode==='any'?'SEM FILTRO':'CIDADE EXATA'} • {job.pages} pág.</p></div>
              <label className="admin-import-toggle" title={job.enabled?'Desligar automação':'Ligar automação'}><input type="checkbox" checked={job.enabled} onChange={e=>updateImportJob(job,{enabled:e.target.checked})}/><span><Power size={14}/></span></label>
            </div>
            <div className="admin-import-job-status">
              <div><span>ÚLTIMA EXECUÇÃO</span><b>{job.last_run_at?new Date(job.last_run_at).toLocaleString('pt-BR'):'Nunca'}</b></div>
              <div><span>RECEBIDOS</span><b>{job.last_received||0}</b></div>
              <div><span>IMPORTADOS</span><b>{job.last_imported||0}</b></div>
              <div><span>STATUS</span><b className={job.last_status==='error'?'bad':job.last_status==='success'?'good':''}>{job.last_status==='success'?'SUCESSO':job.last_status==='error'?'ERRO':'—'}</b></div>
            </div>
            {job.last_error?<div className="admin-import-error">{job.last_error}</div>:null}
            <div className="admin-import-job-actions">
              <select className="admin-import-mode-select" value={job.location_mode||'exact'} onChange={e=>updateImportJob(job,{location_mode:e.target.value as any})} title="Modo de localização"><option value="exact">Cidade exata</option><option value="region">Região próxima</option><option value="state">Todo estado</option><option value="any">Sem filtro</option></select>
              <button className="primary" onClick={()=>previewImportJob(job)} disabled={busy===`preview-${job.id}`}><Search size={14}/>{busy===`preview-${job.id}`?' ANALISANDO...':' PRÉ-VISUALIZAR'}</button>
              <button onClick={()=>runImportJob(job)} disabled={busy===`run-${job.id}`}><Play size={14}/>{busy===`run-${job.id}`?' IMPORTANDO...':' IMPORTAR AGORA'}</button>
              <button onClick={()=>deleteImportJob(job)} disabled={busy===`del-${job.id}`}><Trash2 size={14}/> EXCLUIR</button>
            </div>
          </article>):<div className="admin-import-empty"><Radar size={28}/><h3>NENHUMA BUSCA CONFIGURADA</h3><p>Crie acima sua primeira pesquisa automática.</p></div>}
        </div>

        {importPreview?<div className="admin-import-preview">
          <div className="admin-import-preview-head"><div><Search size={18}/><div><span>PRÉ-VISUALIZAÇÃO</span><strong>{importPreview.received} encontrados • {importPreview.accepted} aceitos • {importPreview.locationRejected} rejeitados</strong></div></div><button onClick={()=>setImportPreview(null)}>FECHAR</button></div>
          <div className="admin-import-preview-cols">
            <div><h4><CheckCircle2 size={15}/> ACEITOS ({importPreview.accepted})</h4>{importPreview.acceptedPreview.length?importPreview.acceptedPreview.map((x:any)=><div className="admin-import-preview-row accepted" key={`a-${x.id}`}><div><b>{x.title}</b><small>{x.city||'—'}{x.state?`/${x.state}`:''} • {x.reason}</small></div><span>{x.priceDisplay||money(x.price)}</span></div>):<p>Nenhum resultado aceito.</p>}</div>
            <div><h4><XCircle size={15}/> REJEITADOS ({importPreview.locationRejected})</h4>{importPreview.rejectedPreview.length?importPreview.rejectedPreview.map((x:any)=><div className="admin-import-preview-row rejected" key={`r-${x.id}`}><div><b>{x.title}</b><small>{x.city||'—'}{x.state?`/${x.state}`:''} • {x.reason}</small></div><span>{x.priceDisplay||money(x.price)}</span></div>):<p>Nenhum resultado rejeitado.</p>}</div>
          </div>
          <div className="admin-import-preview-foot"><span>A prévia não salva nada no banco.</span><button className="btn btn-red" onClick={()=>{const job=importJobs.find(x=>x.id===importPreview.jobId);if(job)runImportJob(job)}}><Play size={15}/> IMPORTAR ACEITOS</button></div>
        </div>:null}

        <div className="admin-import-log-card">
          <h3><RefreshCw size={16}/> HISTÓRICO DE EXECUÇÕES</h3>
          <div className="admin-import-log-table">
            {importLogs.slice(0,20).map(log=><div className="admin-import-log-row" key={log.id}>
              <span className={`dot ${log.status}`}/>
              <div><b>{log.keyword||'Busca'}</b><small>{importCategoryLabel(log.search_category)} • {[log.city,log.state].filter(Boolean).join('/')||'Todo Brasil'} • {log.trigger_source==='cron'?'AUTOMÁTICO':'MANUAL'}</small></div>
              <span>{log.received} recebidos</span><span>{log.imported} importados</span>
              <time>{log.started_at?new Date(log.started_at).toLocaleString('pt-BR'):'—'}</time>
            </div>)}
          </div>
        </div>
      </section>:null}

      {tab==='visitors'?<AdminAnalytics/>:null}

      {tab==='events'?<AdminEvents/>:null}

      {tab==='users'?<section className="admin-table-wrap">
        <div className="admin-table-head"><span>{filteredUsers.length} usuários</span><small>Controle conta, dados e permissão. Usuários comuns ficam sem selo.</small></div>
        <div className="admin-user-grid">{filteredUsers.map(u=><article key={u.id} className="admin-user-card">
          <div className="admin-user-top"><div className="admin-avatar">{u.avatar_url?<img src={u.avatar_url} alt=""/>:<span>{String(u.name||u.email||'U')[0].toUpperCase()}</span>}</div><div><input className="admin-user-name" value={u.name||''} onChange={e=>patchUser(u.id,'name',e.target.value)}/><input className="admin-user-email" value={u.email||''} onChange={e=>patchUser(u.id,'email',e.target.value)}/><UserBadge badge={u.badge}/></div></div>
          <div className="admin-user-fields"><label>Cidade<input value={u.city||''} onChange={e=>patchUser(u.id,'city',e.target.value)}/></label><label>UF<input value={u.state||''} maxLength={2} onChange={e=>patchUser(u.id,'state',e.target.value)}/></label><label className="wide">WhatsApp<input value={u.whatsapp||''} onChange={e=>patchUser(u.id,'whatsapp',e.target.value)}/></label><label>Selo<input value={u.role==='admin'?'ADM':'SEM SELO'} readOnly/></label><label>Função<select value={u.role||'user'} onChange={e=>patchUser(u.id,'role',e.target.value)}><option value="user">Usuário</option><option value="admin">Administrador</option></select></label><label>Status<select value={u.account_status||'active'} onChange={e=>patchUser(u.id,'account_status',e.target.value)}><option value="active">Ativo</option><option value="suspended">Suspenso</option><option value="blocked">Bloqueado</option></select></label><label className="wide">Nota interna<input value={u.last_admin_note||''} onChange={e=>patchUser(u.id,'last_admin_note',e.target.value)} placeholder="Observação visível somente ao ADM"/></label></div>
          <div className="admin-user-actions"><button onClick={()=>updateUser(u)} disabled={busy===`u-${u.id}`} className="admin-save"><Save size={15}/> SALVAR USUÁRIO</button><button onClick={()=>deleteUser(u)} className="admin-delete"><Trash2 size={15}/> EXCLUIR</button></div>
        </article>)}</div>
      </section>:null}
    </main>
  </div>
}
