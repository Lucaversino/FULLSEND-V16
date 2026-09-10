import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export const dynamic='force-dynamic'

function pct(n:number){return Math.round(n*10)/10}
function avg(nums:number[]){
  return nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length):0
}
function isoDay(d:string){
  const x=new Date(d)
  return Number.isNaN(x.getTime())?'':x.toISOString().slice(0,10)
}

export async function GET(req:Request){
  const gate=await requireAdmin()
  if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})

  const url=new URL(req.url)
  const requested=Number(url.searchParams.get('days')||7)
  const days=[1,7,30,90].includes(requested)?requested:7
  const since=new Date(Date.now()-days*86400000).toISOString()

  const [sessionsRes,pageviewsRes]=await Promise.all([
    gate.admin
      .from('analytics_sessions')
      .select('session_key,visitor_key,started_at,last_seen_at,duration_seconds,pageviews,entry_path,last_path,referrer_host,device_type,browser_family')
      .gte('started_at',since)
      .order('started_at',{ascending:false})
      .limit(10000),
    gate.admin
      .from('analytics_pageviews')
      .select('visitor_key,path,viewed_at')
      .gte('viewed_at',since)
      .order('viewed_at',{ascending:false})
      .limit(20000),
  ])

  if(sessionsRes.error||pageviewsRes.error){
    const message=sessionsRes.error?.message||pageviewsRes.error?.message||'Analytics indisponível.'
    return NextResponse.json({
      error:message,
      setup:message.includes('analytics_')?'Rode supabase/migrations/010_site_analytics.sql no Supabase.':undefined
    },{status:400})
  }

  const sessions=sessionsRes.data||[]
  const pageviews=pageviewsRes.data||[]
  const visitors=new Set(sessions.map((x:any)=>x.visitor_key)).size
  const totalSessions=sessions.length
  const totalPageviews=pageviews.length
  const durations=sessions.map((x:any)=>Number(x.duration_seconds)||0)
  const bounce=sessions.filter((x:any)=>(Number(x.pageviews)||1)<=1).length
  const fiveMinAgo=Date.now()-5*60000
  const online=sessions.filter((x:any)=>new Date(x.last_seen_at).getTime()>=fiveMinAgo).length

  const topPagesMap=new Map<string,number>()
  for(const x of pageviews){
    const path=String((x as any).path||'/')
    topPagesMap.set(path,(topPagesMap.get(path)||0)+1)
  }
  const topPages=[...topPagesMap.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,10)
    .map(([path,views])=>({path,views}))

  const deviceMap=new Map<string,number>()
  const browserMap=new Map<string,number>()
  const refMap=new Map<string,number>()
  for(const x of sessions as any[]){
    deviceMap.set(x.device_type||'unknown',(deviceMap.get(x.device_type||'unknown')||0)+1)
    browserMap.set(x.browser_family||'Other',(browserMap.get(x.browser_family||'Other')||0)+1)
    const ref=x.referrer_host||'Direto / sem referência'
    refMap.set(ref,(refMap.get(ref)||0)+1)
  }

  const devices=[...deviceMap.entries()].sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}))
  const browsers=[...browserMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,count])=>({name,count}))
  const referrers=[...refMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=>({name,count}))

  const dailyMap=new Map<string,{visitors:Set<string>;sessions:number;pageviews:number}>()
  for(let i=days-1;i>=0;i--){
    const d=new Date(Date.now()-i*86400000).toISOString().slice(0,10)
    dailyMap.set(d,{visitors:new Set(),sessions:0,pageviews:0})
  }
  for(const x of sessions as any[]){
    const day=isoDay(x.started_at)
    const row=dailyMap.get(day)
    if(row){row.sessions++;row.visitors.add(x.visitor_key)}
  }
  for(const x of pageviews as any[]){
    const day=isoDay(x.viewed_at)
    const row=dailyMap.get(day)
    if(row)row.pageviews++
  }
  const daily=[...dailyMap.entries()].map(([date,x])=>({
    date,visitors:x.visitors.size,sessions:x.sessions,pageviews:x.pageviews
  }))

  const recent=sessions.slice(0,60).map((x:any)=>({
    sessionKey:String(x.session_key).slice(0,8),
    visitorKey:String(x.visitor_key).slice(0,8),
    startedAt:x.started_at,
    lastSeenAt:x.last_seen_at,
    duration:Number(x.duration_seconds)||0,
    pageviews:Number(x.pageviews)||1,
    entryPath:x.entry_path||'/',
    lastPath:x.last_path||'/',
    device:x.device_type||'unknown',
    browser:x.browser_family||'Other',
    referrer:x.referrer_host||'Direto',
  }))

  return NextResponse.json({
    success:true,
    days,
    summary:{
      visitors,
      sessions:totalSessions,
      pageviews:totalPageviews,
      avgDuration:avg(durations),
      bounceRate:totalSessions?pct((bounce/totalSessions)*100):0,
      online,
      pagesPerSession:totalSessions?pct(totalPageviews/totalSessions):0,
    },
    daily,topPages,devices,browsers,referrers,recent,
  })
}
