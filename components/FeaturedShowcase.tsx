'use client'

import { useEffect, useRef, useState } from 'react'
import ListingCard from '@/components/ListingCard'
import type { UnifiedListing } from '@/lib/listings'
import { ChevronLeft, ChevronRight, Crown, Sparkles } from 'lucide-react'
import { selectFeatured,featuredKey,type RotationHistory } from '@/lib/featured-rotation'
import type { FeaturedFilters } from '@/lib/featured-listings'

const MAX_VISIBLE=10
const HISTORY_KEY='fullsend-featured-cycle-v2:'

export default function FeaturedShowcase({items,filters={},initialError=''}:{items:UnifiedListing[];filters?:FeaturedFilters;initialError?:string}){
  const viewportRef=useRef<HTMLDivElement>(null)
  const trackRef=useRef<HTMLDivElement>(null)
  const positionRef=useRef(0)
  const halfWidthRef=useRef(0)
  const rafRef=useRef<number|0>(0)
  const [visible,setVisible]=useState<UnifiedListing[]>(()=>items.slice(0,MAX_VISIBLE))
  const [error,setError]=useState(initialError)
  const [refreshing,setRefreshing]=useState(false)
  const refreshRef=useRef<()=>void>(()=>{})
  const query=new URLSearchParams({city:filters.city||'',state:filters.state||'',category:filters.category||'',brand:filters.brand||''}).toString()

  useEffect(()=>{
    let active=true,busy=false,selected=false
    let pool=items
    const controller=new AbortController()
    const storageKey=HISTORY_KEY+query
    let history:RotationHistory={seen:[],last:[]}
    try{const stored=JSON.parse(localStorage.getItem(storageKey)||'null');if(Array.isArray(stored?.seen)&&Array.isArray(stored?.last))history=stored}catch{}
    const rotate=(next:UnifiedListing[])=>{
      const result=selectFeatured(next,history,MAX_VISIBLE)
      history=result.history
      try{localStorage.setItem(storageKey,JSON.stringify(history))}catch{}
      positionRef.current=0
      if(trackRef.current)trackRef.current.style.transform='translate3d(0,0,0)'
      setVisible(result.items);selected=true
    }
    const signature=(list:UnifiedListing[])=>list.map(featuredKey).sort().join('|')
    const update=async(forceRotate=false)=>{
      if(busy||!active)return
      busy=true;setRefreshing(true)
      try{
        const res=await fetch('/api/featured?'+query,{cache:'no-store',credentials:'same-origin',signal:controller.signal})
        if(!res.ok)throw new Error('Não foi possível atualizar os destaques.')
        const data=await res.json()
        if(!Array.isArray(data.items))throw new Error('Resposta inválida.')
        if(!active)return
        const next=data.items as UnifiedListing[]
        if(!selected||forceRotate||signature(next)!==signature(pool))rotate(next)
        else {const map=new Map(next.map(x=>[featuredKey(x),x]));setVisible(current=>current.map(x=>map.get(featuredKey(x))).filter((x):x is UnifiedListing=>Boolean(x)))}
        pool=next;setError('')
      }catch{
        if(active){if(!selected)rotate(pool);setError('Não foi possível atualizar os destaques. A seleção exibida pode estar desatualizada. Tente novamente.')}
      }finally{busy=false;if(active)setRefreshing(false)}
    }
    refreshRef.current=()=>{void update(true)}
    void update(true)
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void update()},30000)
    const onFocus=()=>{void update()}
    const onStorage=(event:StorageEvent)=>{if(event.key==='fullsend-featured-changed')void update()}
    const onPageShow=(event:PageTransitionEvent)=>{if(event.persisted)void update(true)}
    window.addEventListener('focus',onFocus)
    window.addEventListener('storage',onStorage)
    window.addEventListener('pageshow',onPageShow)
    return()=>{active=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',onFocus);window.removeEventListener('storage',onStorage);window.removeEventListener('pageshow',onPageShow)}
  },[items,query])

  useEffect(()=>{
    const track=trackRef.current
    if(!track || visible.length<2)return

    let mounted=true
    let resizeObserver:ResizeObserver|null=null

    const measure=()=>{
      if(!trackRef.current)return
      const first=trackRef.current.children[0] as HTMLElement|undefined
      const second=trackRef.current.children[visible.length] as HTMLElement|undefined
      const half=first&&second?second.offsetLeft-first.offsetLeft:trackRef.current.scrollWidth/2
      halfWidthRef.current=half

      if(half>0){
        positionRef.current=((positionRef.current%half)+half)%half
        trackRef.current.style.transform=`translate3d(${-positionRef.current}px,0,0)`
      }
    }

    requestAnimationFrame(measure)

    if(typeof ResizeObserver!=='undefined'){
      resizeObserver=new ResizeObserver(measure)
      resizeObserver.observe(track)
    }else{
      window.addEventListener('resize',measure)
    }

    let last=performance.now()
    const speed=42 // px/segundo: movimento visível e contínuo

    const tick=(now:number)=>{
      if(!mounted)return

      const currentTrack=trackRef.current
      const half=halfWidthRef.current
      const dt=Math.min(40,Math.max(0,now-last))
      last=now

      if(currentTrack && half>0){
        positionRef.current += speed*(dt/1000)

        if(positionRef.current>=half){
          positionRef.current-=half
        }

        currentTrack.style.transform=`translate3d(${-positionRef.current}px,0,0)`
      }

      rafRef.current=requestAnimationFrame(tick)
    }

    rafRef.current=requestAnimationFrame(tick)

    return()=>{
      mounted=false
      if(rafRef.current)cancelAnimationFrame(rafRef.current)
      resizeObserver?.disconnect()
      window.removeEventListener('resize',measure)
    }
  },[visible])

  function move(direction:-1|1){
    const track=trackRef.current
    const half=halfWidthRef.current
    if(!track || half<=0)return

    const firstCard=track.querySelector<HTMLElement>('.featured-carousel-item')
    const cardWidth=firstCard?.getBoundingClientRect().width||258
    const step=cardWidth+12

    // Seta direita avança; esquerda volta.
    positionRef.current += step*direction
    positionRef.current=((positionRef.current%half)+half)%half
    track.style.transform=`translate3d(${-positionRef.current}px,0,0)`
  }

  if(!visible.length&&!error&&!refreshing)return null
  const loopItems=visible.length>1?[...visible,...visible]:visible

  return <section className="featured-showcase">
    <div className="featured-showcase-head">
      <div>
        <span className="section-kicker">SELEÇÃO FULLSEND</span>
        <h2>ANÚNCIOS EM DESTAQUE</h2>
        <p className="featured-subtitle">
          O carrossel segue rodando automaticamente. Use as setas para navegar e clique no anúncio para abrir.
        </p>
      </div>

      <div className="featured-legend">
        <span><Sparkles size={13}/>DESTAQUE</span>
        <span className="vip"><Crown size={13}/>VIP</span>
      </div>
    </div>

    <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:12}}>
      <button type="button" className="btn" disabled={refreshing} onClick={()=>refreshRef.current()}>{refreshing?'Atualizando…':'Atualizar destaques'}</button>
      {error?<small role="alert" style={{color:'#ff929b'}}>{error}</small>:null}
    </div>

    <div className="featured-carousel-shell">
      <button
        type="button"
        className="featured-carousel-arrow featured-carousel-arrow-left"
        onClick={()=>move(-1)}
        aria-label="Voltar anúncios"
      >
        <ChevronLeft size={25}/>
      </button>

      <div ref={viewportRef} className="featured-carousel-viewport">
        <div ref={trackRef} className="featured-carousel-track featured-carousel-track-raf">
          {loopItems.map((x,index)=>
            <div
              className={`featured-carousel-item ${x.isVip?'vip':''}`}
              key={`${x.kind}-${x.id}-${index}`}
              aria-hidden={index>=visible.length ? true : undefined}
            >
              <ListingCard x={x}/>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="featured-carousel-arrow featured-carousel-arrow-right"
        onClick={()=>move(1)}
        aria-label="Avançar anúncios"
      >
        <ChevronRight size={25}/>
      </button>
    </div>
  </section>
}
