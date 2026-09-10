'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity, BrainCircuit, Clock3, Eye, Gauge, Globe2, Monitor,
  MousePointerClick, RefreshCw, Smartphone, Sparkles, Users, Zap
} from 'lucide-react'

type AnalyticsData={
  days:number
  summary:{
    visitors:number
    sessions:number
    pageviews:number
    avgDuration:number
    bounceRate:number
    online:number
    pagesPerSession:number
  }
  daily:{date:string;visitors:number;sessions:number;pageviews:number}[]
  topPages:{path:string;views:number}[]
  devices:{name:string;count:number}[]
  browsers:{name:string;count:number}[]
  referrers:{name:string;count:number}[]
  recent:{
    sessionKey:string;visitorKey:string;startedAt:string;lastSeenAt:string;
    duration:number;pageviews:number;entryPath:string;lastPath:string;
    device:string;browser:string;referrer:string
  }[]
}

type Insight={
  headline:string
  summary:string
  opportunities:string[]
  alerts:string[]
  actions:string[]
}

function duration(sec:number){
  if(sec<60)return `${sec}s`
  const m=Math.floor(sec/60),s=sec%60
  if(m<60)return `${m}m ${s}s`
  const h=Math.floor(m/60)
  return `${h}h ${m%60}m`
}

function dayLabel(v:string){
  const d=new Date(`${v}T12:00:00`)
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})
}

function deviceLabel(v:string){
  if(v==='mobile')return'Celular'
  if(v==='tablet')return'Tablet'
  if(v==='desktop')return'Computador'
  return'Outro'
}

export default function AdminAnalytics(){
  const [days,setDays]=useState(7)
  const [data,setData]=useState<AnalyticsData|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [insight,setInsight]=useState<Insight|null>(null)
  const [aiBusy,setAiBusy]=useState(false)

  async function load(nextDays=days){
    setLoading(true);setError('')
    try{
      const r=await fetch(`/api/admin/analytics?days=${nextDays}`,{cache:'no-store'})
      const j=await r.json()
      if(!r.ok)throw new Error(j.setup||j.error||'Erro ao carregar visitantes.')
      setData(j)
    }catch(e:any){
      setError(e?.message||'Erro ao carregar visitantes.')
      setData(null)
    }finally{setLoading(false)}
  }

  useEffect(()=>{load(days)},[days])

  async function analyze(){
    if(!data||aiBusy)return
    setAiBusy(true);setError('')
    try{
      const r=await fetch('/api/admin/analytics/insights',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({analytics:data}),
      })
      const j=await r.json()
      if(!r.ok)throw new Error(j.error||'Erro na análise por IA.')
      setInsight(j.insight)
    }catch(e:any){
      setError(e?.message||'Erro na análise por IA.')
    }finally{setAiBusy(false)}
  }

  const maxDaily=useMemo(
    ()=>Math.max(1,...(data?.daily||[]).map(x=>x.visitors)),
    [data]
  )

  if(loading&&!data)return <div className="analytics-loading"><RefreshCw className="spin" size={22}/> Carregando analytics...</div>

  if(error&&!data)return <section className="analytics-setup-error">
    <Activity size={28}/>
    <div>
      <h2>ANALYTICS AINDA NÃO ESTÁ PRONTO</h2>
      <p>{error}</p>
      <code>supabase/migrations/010_site_analytics.sql</code>
      <button onClick={()=>load(days)}><RefreshCw size={14}/> TENTAR NOVAMENTE</button>
    </div>
  </section>

  if(!data)return null
  const s=data.summary

  return <div className="analytics-admin">
    <section className="analytics-toolbar">
      <div>
        <span>FULLSEND INSIGHTS</span>
        <h2>VISITANTES & COMPORTAMENTO</h2>
        <p>Analytics próprio com sessões anônimas, tempo ativo e leitura estratégica por IA.</p>
      </div>
      <div className="analytics-toolbar-actions">
        <select value={days} onChange={e=>{setDays(Number(e.target.value));setInsight(null)}}>
          <option value={1}>Hoje / 24h</option>
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
        <button onClick={()=>load(days)} title="Atualizar"><RefreshCw size={16}/></button>
        <button className="analytics-ai-button" onClick={analyze} disabled={aiBusy}>
          <BrainCircuit size={17}/>{aiBusy?' ANALISANDO...':' ANALISAR COM IA'}
        </button>
      </div>
    </section>

    {error?<div className="analytics-inline-error">{error}</div>:null}

    <section className="analytics-stat-grid">
      <article><Users/><span>VISITANTES ÚNICOS</span><strong>{s.visitors}</strong><small>navegadores distintos no período</small></article>
      <article><Activity/><span>SESSÕES</span><strong>{s.sessions}</strong><small>visitas iniciadas</small></article>
      <article><Eye/><span>VISUALIZAÇÕES</span><strong>{s.pageviews}</strong><small>{s.pagesPerSession} páginas por sessão</small></article>
      <article className="hot"><Clock3/><span>TEMPO MÉDIO</span><strong>{duration(s.avgDuration)}</strong><small>tempo ativo médio</small></article>
      <article className="online"><Zap/><span>ONLINE AGORA</span><strong>{s.online}</strong><small>ativos nos últimos 5 min</small></article>
      <article><MousePointerClick/><span>SESSÃO DE 1 PÁGINA</span><strong>{s.bounceRate}%</strong><small>sessões com apenas 1 pageview</small></article>
    </section>

    {insight?<section className="analytics-ai-panel">
      <div className="analytics-ai-head"><BrainCircuit size={24}/><div><span>FULLSEND AI INSIGHTS</span><h3>{insight.headline}</h3></div></div>
      <p>{insight.summary}</p>
      <div className="analytics-ai-columns">
        <div><b>OPORTUNIDADES</b>{insight.opportunities.map((x,i)=><span key={i}><Sparkles size={12}/>{x}</span>)}</div>
        <div><b>PRÓXIMAS AÇÕES</b>{insight.actions.map((x,i)=><span key={i}><Gauge size={12}/><em>{i+1}</em>{x}</span>)}</div>
        {insight.alerts.length?<div className="alerts"><b>ATENÇÃO</b>{insight.alerts.map((x,i)=><span key={i}><Activity size={12}/>{x}</span>)}</div>:null}
      </div>
      <small>A IA recebe somente métricas agregadas desta tela; IDs de visitantes não são enviados ao modelo.</small>
    </section>:null}

    <section className="analytics-grid-main">
      <article className="analytics-card analytics-traffic">
        <header><div><span>TRÁFEGO</span><h3>VISITANTES POR DIA</h3></div><Globe2 size={19}/></header>
        <div className="analytics-bars">
          {data.daily.map(x=><div className="analytics-bar-col" key={x.date}>
            <div className="analytics-bar-value">{x.visitors}</div>
            <div className="analytics-bar-track"><div style={{height:`${Math.max(4,(x.visitors/maxDaily)*100)}%`}}/></div>
            <small>{dayLabel(x.date)}</small>
          </div>)}
        </div>
      </article>

      <article className="analytics-card">
        <header><div><span>CONTEÚDO</span><h3>PÁGINAS MAIS VISTAS</h3></div><Eye size={19}/></header>
        <div className="analytics-ranking">
          {data.topPages.length?data.topPages.map((x,i)=><div key={x.path}>
            <em>{String(i+1).padStart(2,'0')}</em><span title={x.path}>{x.path}</span><b>{x.views}</b>
          </div>):<p className="analytics-empty">Ainda não há pageviews suficientes.</p>}
        </div>
      </article>
    </section>

    <section className="analytics-grid-three">
      <article className="analytics-card">
        <header><div><span>DISPOSITIVOS</span><h3>COMO ACESSAM</h3></div><Smartphone size={19}/></header>
        <div className="analytics-mini-bars">
          {data.devices.map(x=><div key={x.name}><span>{deviceLabel(x.name)}</span><div><i style={{width:`${s.sessions?Math.max(3,(x.count/s.sessions)*100):0}%`}}/></div><b>{x.count}</b></div>)}
        </div>
      </article>

      <article className="analytics-card">
        <header><div><span>NAVEGADORES</span><h3>TECNOLOGIA</h3></div><Monitor size={19}/></header>
        <div className="analytics-mini-bars">
          {data.browsers.map(x=><div key={x.name}><span>{x.name}</span><div><i style={{width:`${s.sessions?Math.max(3,(x.count/s.sessions)*100):0}%`}}/></div><b>{x.count}</b></div>)}
        </div>
      </article>

      <article className="analytics-card">
        <header><div><span>ORIGEM</span><h3>COMO CHEGARAM</h3></div><Globe2 size={19}/></header>
        <div className="analytics-ranking compact">
          {data.referrers.map((x,i)=><div key={x.name}><em>{i+1}</em><span>{x.name}</span><b>{x.count}</b></div>)}
        </div>
      </article>
    </section>

    <section className="analytics-card analytics-recent">
      <header><div><span>SESSÕES</span><h3>VISITANTES RECENTES</h3></div><Activity size={19}/></header>
      <div className="analytics-session-table">
        <div className="head"><span>VISITANTE</span><span>ENTRADA</span><span>ÚLTIMA PÁGINA</span><span>PÁGINAS</span><span>TEMPO</span><span>DISPOSITIVO</span><span>ÚLTIMO SINAL</span></div>
        {data.recent.map((x,i)=><div className="row" key={`${x.sessionKey}-${i}`}>
          <span><i className={new Date(x.lastSeenAt).getTime()>Date.now()-5*60000?'live':''}/>{x.visitorKey}</span>
          <span title={x.entryPath}>{x.entryPath}</span>
          <span title={x.lastPath}>{x.lastPath}</span>
          <b>{x.pageviews}</b>
          <b>{duration(x.duration)}</b>
          <span>{deviceLabel(x.device)} • {x.browser}</span>
          <span>{new Date(x.lastSeenAt).toLocaleString('pt-BR')}</span>
        </div>)}
      </div>
      <footer>Identificadores são anônimos e abreviados. O sistema não armazena endereço IP.</footer>
    </section>
  </div>
}
