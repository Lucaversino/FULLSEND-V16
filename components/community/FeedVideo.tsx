'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, VolumeX } from 'lucide-react'

export default function FeedVideo({src,label,onOpen}:{src:string;label:string;onOpen:()=>void}){
 const ref=useRef<HTMLVideoElement>(null)
 const [ready,setReady]=useState(false),[playing,setPlaying]=useState(false)
 useEffect(()=>{const video=ref.current;if(!video)return;const mobile=matchMedia('(hover: none)').matches
  const observer=new IntersectionObserver(([entry])=>{if(!mobile)return;if(entry.isIntersecting&&entry.intersectionRatio>=.72)video.play().catch(()=>{});else video.pause()},{threshold:[0,.72,1]})
  observer.observe(video);return()=>observer.disconnect()
 },[])
 function start(){if(matchMedia('(hover: hover)').matches)ref.current?.play().catch(()=>{})}
 function stop(){if(matchMedia('(hover: hover)').matches){ref.current?.pause();if(ref.current)ref.current.currentTime=0}}
 return <button type="button" className={`cm-feed-video ${ready?'is-ready':''}`} onMouseEnter={start} onMouseLeave={stop} onFocus={start} onBlur={stop} onClick={onOpen} aria-label={`${label}. Abrir publicação e ativar som`}>
  <video ref={ref} src={src} muted loop playsInline preload="metadata" onLoadedData={()=>setReady(true)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/>
  {!ready&&<span className="cm-video-loading"><i/>Carregando prévia…</span>}
  {!playing&&ready&&<span className="cm-video-play"><Play fill="currentColor"/></span>}
  <span className="cm-video-muted"><VolumeX size={15}/> Prévia sem som</span>
 </button>
}
