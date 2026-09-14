import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Star } from 'lucide-react'
import EventCard from '@/components/events/EventCard'
import EventFilters from '@/components/events/EventFilters'
import { EVENTS_PER_PAGE, fetchEventsPage } from '@/lib/events'

export const dynamic='force-dynamic'
export const revalidate=0

export const metadata:Metadata={
  title:'Eventos Automotivos',
  description:'Encontre encontros, drift, arrancada, track days, exposições e eventos automotivos no FULLSEND.',
  alternates:{canonical:'/eventos'},
  openGraph:{
    title:'Eventos Automotivos | FULLSEND',
    description:'Descubra eventos automotivos perto de você.',
    type:'website',
    url:'/eventos',
  }
}

function n(v?:string){const x=Number(v);return Number.isFinite(x)?x:undefined}

function pages(current:number,total:number){
  if(total<=7)return Array.from({length:total},(_,i)=>i+1)
  const s=new Set([1,total,current-1,current,current+1])
  return [...s].filter(x=>x>=1&&x<=total).sort((a,b)=>a-b)
}

function href(p:Record<string,string|undefined>,page:number){
  const q=new URLSearchParams()
  for(const [k,v] of Object.entries(p))if(v&&k!=='page')q.set(k,v)
  if(page>1)q.set('page',String(page))
  return `/eventos${q.toString()?`?${q}`:''}#eventos-lista`
}

export default async function Eventos({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const p=await searchParams
  const requested=Math.max(1,Math.trunc(n(p.page)||1))
  const date=p.data||undefined
  let result=await fetchEventsPage({
    page:requested,
    state:p.estado,
    city:p.cidade,
    category:p.categoria,
    dateFrom:date,
    dateTo:date,
    lat:n(p.lat),
    lng:n(p.lng),
    radiusKm:n(p.raio),
  })
  let totalPages=Math.max(1,Math.ceil(result.total/EVENTS_PER_PAGE))
  let current=Math.min(requested,totalPages)
  if(!result.error&&result.total>0&&requested>totalPages){
    result=await fetchEventsPage({
      page:totalPages,state:p.estado,city:p.cidade,category:p.categoria,dateFrom:date,dateTo:date,
      lat:n(p.lat),lng:n(p.lng),radiusKm:n(p.raio),
    })
    current=totalPages
  }
  const featured=result.data.filter(x=>x.featured)
  const normal=result.data.filter(x=>!x.featured)

  return <main className="section events-page">
    <div className="container">
      <div className="events-hero">
        <div><span className="section-kicker">FULLSEND CULTURE</span><h1>EVENTOS AUTOMOTIVOS</h1><p>Encontros, pista, projetos, som, clássicos e motorsport em um só lugar.</p></div>
        <Link href="/eventos/adicionar" className="events-add-btn"><Plus size={17}/> CRIAR EVENTO</Link>
      </div>

      <EventFilters/>

      {result.error?<div className="event-error"><b>EVENTOS AINDA NÃO CONFIGURADOS</b><span>{result.error}</span><small>Execute a migration 020 no Supabase. A página principal do FULLSEND continua funcionando normalmente.</small></div>:null}

      {!result.error&&featured.length?<section className="events-featured-section">
        <div className="events-section-title"><Star size={18}/><div><span>SELEÇÃO FULLSEND</span><h2>EVENTOS EM DESTAQUE</h2></div></div>
        <div className="event-grid featured-grid">{featured.map(x=><EventCard event={x} key={x.id}/>)}</div>
      </section>:null}

      <section id="eventos-lista" className="events-list-section">
        <div className="events-results-head">
          <div><span>AGENDA AUTOMOTIVA</span><h2>PRÓXIMOS EVENTOS</h2></div>
          <b>{result.total.toLocaleString('pt-BR')} evento{result.total===1?'':'s'}</b>
        </div>

        {!result.error&&result.total===0?<div className="event-empty"><h3>Nenhum evento encontrado.</h3><p>Tente outro Estado, Cidade, Data ou aumente a distância.</p></div>:null}

        {normal.length?<div className="event-grid">{normal.map(x=><EventCard event={x} key={x.id}/>)}</div>:null}

        {totalPages>1?<nav className="event-pagination">
          <Link className={current===1?'disabled':''} href={href(p,Math.max(1,current-1))}>‹</Link>
          {pages(current,totalPages).map(x=><Link className={x===current?'active':''} href={href(p,x)} key={x}>{x}</Link>)}
          <Link className={current===totalPages?'disabled':''} href={href(p,Math.min(totalPages,current+1))}>›</Link>
        </nav>:null}
      </section>
    </div>
  </main>
}
