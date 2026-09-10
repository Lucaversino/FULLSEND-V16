'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const VISITOR_KEY='fullsend_visitor_v1'
const SESSION_KEY='fullsend_session_v1'
const ACTIVE_KEY='fullsend_active_seconds_v1'

function uuid(){
  if(typeof crypto!=='undefined'&&crypto.randomUUID)return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const r=Math.random()*16|0
    const v=c==='x'?r:(r&0x3|0x8)
    return v.toString(16)
  })
}

function getOrCreate(storage:Storage,key:string){
  let value=storage.getItem(key)
  if(!value){
    value=uuid()
    storage.setItem(key,value)
  }
  return value
}

export default function AnalyticsTracker(){
  const pathname=usePathname()
  const visitorRef=useRef('')
  const sessionRef=useRef('')
  const activeRef=useRef(0)
  const lastPathRef=useRef('')

  useEffect(()=>{
    try{
      visitorRef.current=getOrCreate(localStorage,VISITOR_KEY)
      sessionRef.current=getOrCreate(sessionStorage,SESSION_KEY)
      activeRef.current=Math.max(0,Number(sessionStorage.getItem(ACTIVE_KEY)||0)||0)
    }catch{}
  },[])

  function send(action:'pageview'|'heartbeat'|'end',path:string){
    if(!visitorRef.current||!sessionRef.current)return
    const payload={
      visitorKey:visitorRef.current,
      sessionKey:sessionRef.current,
      action,
      path,
      duration:Math.floor(activeRef.current),
      referrer:action==='pageview'?document.referrer:'',
    }
    fetch('/api/analytics/track',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      keepalive:true,
      cache:'no-store',
    }).catch(()=>{})
  }

  useEffect(()=>{
    if(!pathname||!sessionRef.current)return
    if(lastPathRef.current===pathname)return
    lastPathRef.current=pathname
    send('pageview',pathname)
  },[pathname])

  useEffect(()=>{
    let tick=0
    const timer=window.setInterval(()=>{
      if(document.visibilityState==='visible'){
        activeRef.current+=1
        tick+=1
        if(tick>=30){
          tick=0
          try{sessionStorage.setItem(ACTIVE_KEY,String(activeRef.current))}catch{}
          send('heartbeat',lastPathRef.current||pathname||'/')
        }
      }
    },1000)

    const onHidden=()=>{
      if(document.visibilityState==='hidden'){
        try{sessionStorage.setItem(ACTIVE_KEY,String(activeRef.current))}catch{}
        send('heartbeat',lastPathRef.current||pathname||'/')
      }
    }
    const onPageHide=()=>{
      try{sessionStorage.setItem(ACTIVE_KEY,String(activeRef.current))}catch{}
      send('end',lastPathRef.current||pathname||'/')
    }

    document.addEventListener('visibilitychange',onHidden)
    window.addEventListener('pagehide',onPageHide)
    return()=>{
      clearInterval(timer)
      document.removeEventListener('visibilitychange',onHidden)
      window.removeEventListener('pagehide',onPageHide)
    }
  },[pathname])

  return null
}
