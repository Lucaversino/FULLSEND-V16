'use client'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Plus } from 'lucide-react'
import { formatEventDate } from '@/lib/events-shared'

type HomeEvent={
  id:string
  slug:string
  title:string
  category:string
  event_date:string
  city?:string|null
  state?:string|null
  image_url?:string|null
  featured?:boolean
}

export default function HomeEventsCarousel({
  events,
  compact=false,
  title='EVENTOS AUTOMOTIVOS',
  randomize=false,
  autoplay=false,
}:{
  events:HomeEvent[]
  compact?:boolean
  title?:string
  randomize?:boolean
  autoplay?:boolean
}){
  const ref=useRef<HTMLDivElement|null>(null)
  const [shuffled,setShuffled]=useState<HomeEvent[]>(events)
  useEffect(()=>{
    if(!randomize){setShuffled(events);return}
    const copy=[...events]
    for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}
    setShuffled(copy)
  },[events,randomize])
  const displayEvents=useMemo(()=>shuffled,[shuffled])
  useEffect(()=>{
    if(!autoplay||displayEvents.length<2)return
    const timer=window.setInterval(()=>{
      const node=ref.current;if(!node)return
      const first=node.querySelector<HTMLElement>('.home-event-card');const step=(first?.offsetWidth||260)+14
      if(node.scrollLeft+node.clientWidth>=node.scrollWidth-step){node.scrollTo({left:0,behavior:'smooth'})}
      else node.scrollBy({left:step,behavior:'smooth'})
    },3800)
    return()=>window.clearInterval(timer)
  },[autoplay,displayEvents.length])
  if(!events.length)return null

  function move(direction:number){
    const node=ref.current
    if(!node)return
    node.scrollBy({left:direction*Math.max(280,node.clientWidth*.72),behavior:'smooth'})
  }

  return <section className={`home-events-carousel ${compact?'compact':''}`}>
    <div className="home-events-head">
      <div>
        <span><CalendarDays size={14}/> AGENDA FULLSEND</span>
        <h2>{title}</h2>
      </div>
      <div className="home-events-head-actions">
        <Link href="/eventos/adicionar" className="home-events-create"><Plus size={14}/> CRIAR EVENTO</Link>
        <Link href="/eventos" className="home-events-all">VER TODOS</Link>
        <button onClick={()=>move(-1)} aria-label="Eventos anteriores"><ChevronLeft/></button>
        <button onClick={()=>move(1)} aria-label="Próximos eventos"><ChevronRight/></button>
      </div>
    </div>

    <div className="home-events-track" ref={ref}>
      {displayEvents.map(event=><Link href={`/eventos/${event.slug}`} className="home-event-card" key={event.id}>
        <div className="home-event-media">
          {event.image_url?<img src={event.image_url} alt={event.title}/>:<div className="home-event-no-image">FULLSEND<br/>EVENTOS</div>}
          <span>{event.category}</span>
        </div>
        <div className="home-event-body">
          <b>{event.title}</b>
          <small><CalendarDays size={12}/>{formatEventDate(event.event_date)}</small>
          <small><MapPin size={12}/>{event.city||'Brasil'}{event.state?` / ${event.state}`:''}</small>
        </div>
      </Link>)}
    </div>
  </section>
}
