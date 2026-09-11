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
  const pausedRef=useRef(false)
  const [visible,setVisible]=useState<UnifiedListing[]>(()=>items.slice(0,MAX_VISIBLE))

  useEffect(()=>{
    setVisible(shuffle(items).slice(0,MAX_VISIBLE))
  },[items])

  useEffect(()=>{
    const el=viewportRef.current
    if(!el || visible.length<2)return

    let raf=0
    let last=performance.now()
    const speed=26

    const tick=(now:number)=>{
      const dt=Math.min(50,now-last)
      last=now

      if(!pausedRef.current){
        el.scrollLeft += speed*(dt/1000)

        const half=el.scrollWidth/2
        if(half>0 && el.scrollLeft>=half){
          el.scrollLeft-=half
        }
      }

      raf=requestAnimationFrame(tick)
    }

    raf=requestAnimationFrame(tick)
    return()=>cancelAnimationFrame(raf)
  },[visible])

  function move(direction:-1|1){
    const el=viewportRef.current
    if(!el)return

    pausedRef.current=true

    const card=el.querySelector<HTMLElement>('.featured-carousel-item')
    const cardWidth=card?.getBoundingClientRect().width||260
    const amount=(cardWidth+12)*direction

    el.scrollBy({left:amount,behavior:'smooth'})

    window.setTimeout(()=>{
      const half=el.scrollWidth/2
      if(half>0){
        if(el.scrollLeft>=half)el.scrollLeft-=half
        if(el.scrollLeft<0)el.scrollLeft+=half
      }
      pausedRef.current=false
    },450)
  }

  if(!visible.length)return null
  const loopItems=visible.length>1?[...visible,...visible]:visible

  return <section className="featured-showcase">
    <div className="featured-showcase-head">
      <div>
        <span className="section-kicker">SELEÇÃO FULLSEND</span>
        <h2>ANÚNCIOS EM DESTAQUE</h2>
        <p className="featured-subtitle">
          Navegue pelas setas e clique normalmente no anúncio para abrir.
        </p>
      </div>

      <div className="featured-legend">
        <span><Sparkles size={13}/>DESTAQUE</span>
        <span className="vip"><Crown size={13}/>VIP</span>
      </div>
    </div>

    <div
      className="featured-carousel-shell"
      onMouseEnter={()=>{pausedRef.current=true}}
      onMouseLeave={()=>{pausedRef.current=false}}
    >
      <button
        type="button"
        className="featured-carousel-arrow featured-carousel-arrow-left"
        onClick={()=>move(-1)}
        aria-label="Voltar anúncios"
      >
        <ChevronLeft size={25}/>
      </button>

      <div ref={viewportRef} className="featured-carousel-viewport">
        <div className="featured-carousel-track">
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
