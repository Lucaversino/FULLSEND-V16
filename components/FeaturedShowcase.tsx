'use client'

import { useEffect, useRef, useState } from 'react'
import ListingCard from '@/components/ListingCard'
import type { UnifiedListing } from '@/lib/listings'
import { ChevronLeft, ChevronRight, Crown, Sparkles } from 'lucide-react'

const MAX_VISIBLE = 10

function shuffle<T>(items:T[]){
  const copy=[...items]
  for(let i=copy.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1))
    ;[copy[i],copy[j]]=[copy[j],copy[i]]
  }
  return copy
}

export default function FeaturedShowcase({items}:{items:UnifiedListing[]}){
  const viewportRef=useRef<HTMLDivElement>(null)
  const trackRef=useRef<HTMLDivElement>(null)
  const positionRef=useRef(0)
  const halfWidthRef=useRef(0)
  const rafRef=useRef<number|0>(0)
  const [visible,setVisible]=useState<UnifiedListing[]>(()=>items.slice(0,MAX_VISIBLE))

  useEffect(()=>{
    setVisible(shuffle(items).slice(0,MAX_VISIBLE))
  },[items])

  useEffect(()=>{
    const track=trackRef.current
    if(!track || visible.length<2)return

    let mounted=true
    let resizeObserver:ResizeObserver|null=null

    const measure=()=>{
      if(!trackRef.current)return
      const half=trackRef.current.scrollWidth/2
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

  if(!visible.length)return null
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
