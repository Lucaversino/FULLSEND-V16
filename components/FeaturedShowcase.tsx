'use client'

import { useEffect, useRef, useState } from 'react'
import ListingCard from '@/components/ListingCard'
import type { UnifiedListing } from '@/lib/listings'
import { Crown, Sparkles } from 'lucide-react'

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

  // A cada abertura/refresh do site, sorteia novamente até 10 anúncios
  // entre TODOS os VIP/Destaque ativos recebidos da home.
  useEffect(()=>{
    setVisible(shuffle(items).slice(0,MAX_VISIBLE))
  },[items])

  // Movimento automático e infinito. Duplicamos os mesmos itens apenas
  // visualmente para fazer o loop sem criar anúncios falsos.
  useEffect(()=>{
    const el=viewportRef.current
    if(!el || visible.length<2)return

    let raf=0
    let last=performance.now()
    const speed=34 // pixels por segundo

    const tick=(now:number)=>{
      const dt=Math.min(50,now-last)
      last=now
      if(!pausedRef.current){
        el.scrollLeft += speed*(dt/1000)
        const half=el.scrollWidth/2
        if(half>0 && el.scrollLeft>=half) el.scrollLeft-=half
      }
      raf=requestAnimationFrame(tick)
    }
    raf=requestAnimationFrame(tick)
    return()=>cancelAnimationFrame(raf)
  },[visible])

  if(!visible.length)return null
  const loopItems=visible.length>1?[...visible,...visible]:visible

  return <section className="featured-showcase">
    <div className="featured-showcase-head">
      <div>
        <span className="section-kicker">SELEÇÃO FULLSEND</span>
        <h2>ANÚNCIOS EM DESTAQUE</h2>
        <p className="featured-subtitle">Anúncios impulsionados por Pix ou ativados pelo administrador. Até 10 são sorteados a cada atualização.</p>
      </div>
      <div className="featured-legend">
        <span><Sparkles size={13}/>DESTAQUE</span>
        <span className="vip"><Crown size={13}/>VIP</span>
      </div>
    </div>

    <div
      ref={viewportRef}
      className="featured-carousel-viewport"
      onMouseEnter={()=>{pausedRef.current=true}}
      onMouseLeave={()=>{pausedRef.current=false}}
      onTouchStart={()=>{pausedRef.current=true}}
      onTouchEnd={()=>{pausedRef.current=false}}
    >
      <div className="featured-carousel-track">
        {loopItems.map((x,index)=><div
          className={`featured-carousel-item ${x.isVip?'vip':''}`}
          key={`${x.kind}-${x.id}-${index}`}
          aria-hidden={index>=visible.length ? true : undefined}
        ><ListingCard x={x}/></div>)}
      </div>
    </div>
  </section>
}
