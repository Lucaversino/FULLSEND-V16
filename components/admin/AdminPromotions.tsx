'use client'
import { useMemo, useState } from 'react'
import { Crown, Sparkles, CheckCircle2, Clock3, XCircle, ExternalLink } from 'lucide-react'

type Promo={id:string;listing_id:string;user_id:string;promotion_type:'featured'|'vip';amount:number;duration_days:number;status:string;mp_payment_id?:string|null;mp_status?:string|null;started_at?:string|null;expires_at?:string|null;created_at?:string|null;listing_title?:string;listing_slug?:string;user_name?:string;user_email?:string}

function brDate(v?:string|null){return v?new Date(v).toLocaleString('pt-BR'):'—'}
function money(v:number){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}

export default function AdminPromotions({initialPromotions,fullsendListings}:{initialPromotions:Promo[];fullsendListings:any[]}){
  const [items,setItems]=useState(initialPromotions)
  const [filter,setFilter]=useState('all')
  const [q,setQ]=useState('')
  const [busy,setBusy]=useState('')
  const [message,setMessage]=useState('')

  const visible=useMemo(()=>items.filter(x=>{
    const filterOk=filter==='all'||x.status===filter||x.promotion_type===filter
    const s=`${x.listing_title||''} ${x.user_name||''} ${x.user_email||''} ${x.mp_payment_id||''}`.toLowerCase()
    return filterOk&&(!q||s.includes(q.toLowerCase()))
  }),[items,filter,q])

  async function endPromo(x:Promo){
    if(!confirm('Encerrar este impulsionamento agora?'))return
    setBusy(x.id);setMessage('')
    const res=await fetch('/api/admin/promotions',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'end',promotionId:x.id})})
    const data=await res.json().catch(()=>({}))
    setBusy('')
    if(!res.ok){setMessage(data?.error||'Erro ao encerrar.');return}
    setItems(v=>v.map(i=>i.id===x.id?{...i,status:'expired',expires_at:new Date().toISOString()}:i));setMessage('Impulsionamento encerrado.')
  }

  async function manual(listing:any,type:'featured'|'vip'){
    const key=`${listing.id}-${type}`;setBusy(key);setMessage('')
    const res=await fetch('/api/admin/promotions',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'manual_activate',listingId:listing.id,promotionType:type})})
    const data=await res.json().catch(()=>({}));setBusy('')
    if(!res.ok){setMessage(data?.error||'Erro ao ativar.');return}
    setMessage(`${type==='vip'?'VIP':'DESTAQUE'} ativado manualmente. Atualize a página para ver o registro.`)
  }

  return <section className="admin-payments-v16">
    <div className="admin-promo-v16-head"><div><span>FULLSEND IMPULSIONA</span><h2>PAGAMENTOS & IMPULSIONAMENTOS</h2><p>Pix aprovado ativa o anúncio automaticamente.</p></div><div className="admin-promo-v16-count"><b>{items.filter(x=>x.status==='approved').length}</b><small>ativos</small></div></div>
    <div className="admin-promo-v16-toolbar"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar anúncio, usuário, e-mail ou pagamento..."/><div>{['all','approved','pending','vip','featured','expired'].map(f=><button key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>{f==='all'?'TODOS':f==='approved'?'ATIVOS':f==='pending'?'PENDENTES':f==='featured'?'DESTAQUE':f.toUpperCase()}</button>)}</div></div>
    {message?<div className="admin-promo-v16-message">{message}</div>:null}
    <div className="admin-promo-v16-list">{visible.map(x=><article key={x.id} className={`admin-promo-v16-row ${x.promotion_type}`}>
      <div className="admin-promo-v16-icon">{x.promotion_type==='vip'?<Crown/>:<Sparkles/>}</div>
      <div className="admin-promo-v16-main"><div><b>{x.listing_title||x.listing_id}</b><span>{x.user_name||'Usuário'} • {x.user_email||'—'}</span></div><div className="admin-promo-v16-meta"><span>{x.promotion_type==='vip'?'VIP':'DESTAQUE'} • {money(x.amount)}</span><span>MP: {x.mp_payment_id||'—'}</span><span>Início: {brDate(x.started_at)}</span><span>Fim: {brDate(x.expires_at)}</span></div></div>
      <div className={`admin-promo-v16-status ${x.status}`}>{x.status==='approved'?<CheckCircle2/>:x.status==='pending'?<Clock3/>:<XCircle/>}<span>{x.status.toUpperCase()}</span></div>
      <div className="admin-promo-v16-actions">{x.listing_slug?<a href={`/anuncio/${x.listing_slug}`} target="_blank"><ExternalLink size={14}/></a>:null}{x.status==='approved'?<button disabled={busy===x.id} onClick={()=>endPromo(x)}>ENCERRAR</button>:null}</div>
    </article>)}</div>
    {!visible.length?<div className="admin-promo-v16-empty">Nenhum impulsionamento encontrado.</div>:null}
    <div className="admin-manual-boost"><h3>ATIVAÇÃO MANUAL</h3><p>Use para cortesia ou negociação direta. Somente anúncios FULLSEND.</p><div>{fullsendListings.slice(0,30).map((x:any)=><div key={x.id}><span>{x.title}</span><button disabled={!!busy} onClick={()=>manual(x,'featured')}><Sparkles size={13}/> DESTAQUE 7D</button><button disabled={!!busy} onClick={()=>manual(x,'vip')}><Crown size={13}/> VIP 15D</button></div>)}</div></div>
  </section>
}
