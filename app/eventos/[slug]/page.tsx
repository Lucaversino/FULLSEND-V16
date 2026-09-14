import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CalendarDays, Clock3, MapPin, ExternalLink, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fetchEventBySlug, formatEventDate, formatEventTime } from '@/lib/events'
import EventAttendance from '@/components/events/EventAttendance'
import EventShare from '@/components/events/EventShare'
import EventMap from '@/components/events/EventMap'

const site=(process.env.NEXT_PUBLIC_SITE_URL||'https://fullsendmarket.vercel.app').replace(/\/$/,'')

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params
  const event=await fetchEventBySlug(slug)
  if(!event)return {title:'Evento não encontrado'}
  const description=(event.description||`${event.title} em ${event.city||'Brasil'}. Confira detalhes no FULLSEND.`).slice(0,155)
  const url=`${site}/eventos/${event.slug}`
  return {
    title:event.title,
    description,
    alternates:{canonical:url},
    openGraph:{
      title:event.title,
      description,
      type:'website',
      url,
      images:event.image_url?[{url:event.image_url}]:undefined,
    },
  }
}

export default async function EventoDetalhe({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const event=await fetchEventBySlug(slug)
  if(!event)notFound()

  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()
  let going=false
  let participants:any[]=[]
  if(user){
    const {data}=await s.from('event_attendees').select('id').eq('event_id',event.id).eq('user_id',user.id).maybeSingle()
    going=Boolean(data)
  }
  const {data:att}=await s.from('event_attendees').select('user_id').eq('event_id',event.id).limit(8)
  const ids=(att||[]).map((x:any)=>x.user_id)
  if(ids.length){
    const {data:profiles}=await s.from('profiles').select('id,name,avatar_url').in('id',ids)
    participants=profiles||[]
  }

  const startIso=event.event_time?`${event.event_date}T${event.event_time}`:`${event.event_date}T00:00:00`
  const endIso=event.end_date?`${event.end_date}T23:59:59`:undefined
  const eventUrl=`${site}/eventos/${event.slug}`
  const jsonLd={
    '@context':'https://schema.org',
    '@type':'Event',
    name:event.title,
    description:event.description||undefined,
    startDate:startIso,
    endDate:endIso,
    eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',
    eventStatus:'https://schema.org/EventScheduled',
    image:event.image_url?[event.image_url]:undefined,
    location:{
      '@type':'Place',
      name:event.venue||undefined,
      address:{
        '@type':'PostalAddress',
        streetAddress:event.address||undefined,
        addressLocality:event.city||undefined,
        addressRegion:event.state||undefined,
        addressCountry:event.country||'BR',
      },
      geo:event.latitude!=null&&event.longitude!=null?{
        '@type':'GeoCoordinates',
        latitude:event.latitude,
        longitude:event.longitude,
      }:undefined,
    },
    url:eventUrl,
    offers:event.ticket_url?{'@type':'Offer',url:event.ticket_url,availability:'https://schema.org/InStock'}:undefined,
  }

  return <main className="section events-page event-detail-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
    <div className="container">
      <article className="event-detail">
        <div className="event-detail-media">
          {event.image_url?<img src={event.image_url} alt={event.title}/>:<div className="event-no-image">FULLSEND EVENTOS</div>}
          <span>{event.category}</span>
        </div>
        <div className="event-detail-main">
          <span className="section-kicker">EVENTO AUTOMOTIVO</span>
          <h1>{event.title}</h1>
          <div className="event-detail-facts">
            <span><CalendarDays/>{formatEventDate(event.event_date)}</span>
            <span><Clock3/>{formatEventTime(event.event_time)}</span>
            <span><MapPin/>{event.venue||'Local a confirmar'}</span>
            <span><MapPin/>{event.address?`${event.address} • `:''}{event.city||'Brasil'}{event.state?` / ${event.state}`:''}</span>
          </div>
          <div className="event-detail-actions">
            <EventAttendance eventId={event.id} initialCount={event.attendees_count||0}/>
            <EventShare title={event.title} url={eventUrl}/>
            {event.ticket_url?<a className="event-ticket-btn" href={event.ticket_url} target="_blank" rel="noreferrer"><ExternalLink size={16}/> INGRESSOS</a>:null}
            {event.source_url&&event.source_url!==event.ticket_url?<a className="event-site-btn" href={event.source_url} target="_blank" rel="noreferrer"><ExternalLink size={16}/> SITE OFICIAL</a>:null}
          </div>
          <div className="event-attendee-summary"><Users size={17}/><b>{(event.attendees_count||0).toLocaleString('pt-BR')} pessoa{event.attendees_count===1?'':'s'} vão</b></div>
          {participants.length?<div className="event-participant-row">{participants.map((p:any)=><div key={p.id} title={p.name||'Membro FULLSEND'}>{p.avatar_url?<img src={p.avatar_url} alt=""/>:<span>{String(p.name||'F')[0].toUpperCase()}</span>}</div>)}</div>:null}
        </div>
      </article>

      <div className="event-detail-columns">
        <section className="event-description"><span>DETALHES</span><h2>SOBRE O EVENTO</h2><p>{event.description||'O organizador ainda não adicionou uma descrição detalhada.'}</p></section>
        {event.latitude!=null&&event.longitude!=null?<section className="event-map-section"><span>LOCALIZAÇÃO</span><h2>ONDE ACONTECE</h2><EventMap lat={event.latitude} lng={event.longitude} title={event.title}/></section>:null}
      </div>
    </div>
  </main>
}
