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
  const draggingRef=useRef(false)
  const draggedRef=useRef(false)
  const pointerIdRef=useRef<number|null>(null)
  const startXRef=useRef(0)
  const startScrollRef=useRef(0)
  const [dragging,setDragging]=useState(false)
  const [visible,setVisible]=useState<UnifiedListing[]>(()=>items.slice(0,MAX_VISIBLE))

  useEffect(()=>{
    setVisible(shuffle(items).slice(0,MAX_VISIBLE))
  },[items])

  // Movimento automático e infinito quando o usuário não está interagindo.
  useEffect(()=>{
    const el=viewportRef.current
    if(!el || visible.length<2)return

    let raf=0
    let last=performance.now()
    const speed=34

    const tick=(now:number)=>{
      const dt=Math.min(50,now-last)
      last=now

      if(!pausedRef.current && !draggingRef.current){
        el.scrollLeft += speed*(dt/1000)
        const half=el.scrollWidth/2
        if(half>0 && el.scrollLeft>=half)el.scrollLeft-=half
      }

      raf=requestAnimationFrame(tick)
    }

    raf=requestAnimationFrame(tick)
    return()=>cancelAnimationFrame(raf)
  },[visible])

  function normalizeLoop(){
    const el=viewportRef.current
    if(!el || visible.length<2)return

    const half=el.scrollWidth/2
    if(half<=0)return

    while(el.scrollLeft>=half)el.scrollLeft-=half
    while(el.scrollLeft<0)el.scrollLeft+=half
  }

  function onPointerDown(e:React.PointerEvent<HTMLDivElement>){
    const el=viewportRef.current
    if(!el || visible.length<2)return

    draggingRef.current=true
    draggedRef.current=false
    pointerIdRef.current=e.pointerId
    startXRef.current=e.clientX
    startScrollRef.current=el.scrollLeft
    pausedRef.current=true
    setDragging(true)

    try{el.setPointerCapture(e.pointerId)}catch{}
  }

  function onPointerMove(e:React.PointerEvent<HTMLDivElement>){
    const el=viewportRef.current
    if(!el || !draggingRef.current || pointerIdRef.current!==e.pointerId)return

    const dx=e.clientX-startXRef.current
    if(Math.abs(dx)>5)draggedRef.current=true

    el.scrollLeft=startScrollRef.current-dx

    const half=el.scrollWidth/2
    if(half>0){
      if(el.scrollLeft>=half){
        el.scrollLeft-=half
        startScrollRef.current-=half
      }else if(el.scrollLeft<=0 && dx>0){
        el.scrollLeft+=half
        startScrollRef.current+=half
      }
    }
  }

  function finishPointer(e:React.PointerEvent<HTMLDivElement>){
    const el=viewportRef.current
    if(!el || pointerIdRef.current!==e.pointerId)return

    draggingRef.current=false
    pointerIdRef.current=null
    setDragging(false)
    normalizeLoop()

    try{el.releasePointerCapture(e.pointerId)}catch{}

    // No touch, o automático volta após a interação.
    if(e.pointerType==='touch'){
      window.setTimeout(()=>{pausedRef.current=false},500)
    }
  }

  function suppressClickAfterDrag(e:React.MouseEvent<HTMLDivElement>){
    if(!draggedRef.current)return
    e.preventDefault()
    e.stopPropagation()
    draggedRef.current=false
  }

  if(!visible.length)return null
  const loopItems=visible.length>1?[...visible,...visible]:visible

  return <section className="featured-showcase">
    <div className="featured-showcase-head">
      <div>
        <span className="section-kicker">SELEÇÃO FULLSEND</span>
        <h2>ANÚNCIOS EM DESTAQUE</h2>
        <p className="featured-subtitle">
          Arraste o carrossel com o mouse ou dedo para escolher o anúncio que deseja ver.
        </p>
      </div>
      <div className="featured-legend">
        <span><Sparkles size={13}/>DESTAQUE</span>
        <span className="vip"><Crown size={13}/>VIP</span>
      </div>
    </div>

    <div
      ref={viewportRef}
      className={`featured-carousel-viewport ${dragging?'is-dragging':''}`}
      onMouseEnter={()=>{pausedRef.current=true}}
      onMouseLeave={()=>{
        if(!draggingRef.current)pausedRef.current=false
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onClickCapture={suppressClickAfterDrag}
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
