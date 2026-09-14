'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Crosshair, Filter, RotateCcw } from 'lucide-react'
import { EVENT_CATEGORIES } from '@/lib/events'

const RADII=[
  ['25','até 25 km'],
  ['50','até 50 km'],
  ['100','até 100 km'],
  ['250','até 250 km'],
  ['','Brasil inteiro'],
]

export default function EventFilters(){
  const router=useRouter()
  const sp=useSearchParams()
  const [state,setState]=useState(sp.get('estado')||'')
  const [city,setCity]=useState(sp.get('cidade')||'')
  const [category,setCategory]=useState(sp.get('categoria')||'Todos')
  const [date,setDate]=useState(sp.get('data')||'')
  const [radius,setRadius]=useState(sp.get('raio')||'50')
  const [geoMsg,setGeoMsg]=useState('')
  const hasGeo=Boolean(sp.get('lat')&&sp.get('lng'))

  useEffect(()=>{
    setState(sp.get('estado')||'')
    setCity(sp.get('cidade')||'')
    setCategory(sp.get('categoria')||'Todos')
    setDate(sp.get('data')||'')
    setRadius(sp.get('raio')||'50')
  },[sp])

  function build(extra?:Record<string,string|null>){
    const q=new URLSearchParams()
    if(state)q.set('estado',state.toUpperCase())
    if(city)q.set('cidade',city)
    if(category&&category!=='Todos')q.set('categoria',category)
    if(date)q.set('data',date)
    if(hasGeo){
      q.set('lat',sp.get('lat')!)
      q.set('lng',sp.get('lng')!)
      if(radius)q.set('raio',radius)
    }
    for(const [k,v] of Object.entries(extra||{})){
      if(v===null||v==='')q.delete(k);else q.set(k,v)
    }
    q.delete('page')
    return q
  }

  function apply(e:React.FormEvent){
    e.preventDefault()
    const q=build()
    router.push(q.toString()?`/eventos?${q}`:'/eventos')
  }

  function nearMe(){
    if(!navigator.geolocation){
      setGeoMsg('Seu navegador não oferece geolocalização.')
      return
    }
    setGeoMsg('Localizando...')
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const q=build({
          lat:String(pos.coords.latitude),
          lng:String(pos.coords.longitude),
          raio:radius||'50',
        })
        setGeoMsg('')
        router.push(`/eventos?${q}`)
      },
      ()=>{
        setGeoMsg('Localização não autorizada. Você pode continuar usando Estado, Cidade e Data.')
      },
      {enableHighAccuracy:false,timeout:8000,maximumAge:300000}
    )
  }

  function clearGeo(){
    const q=build({lat:null,lng:null,raio:null})
    router.push(q.toString()?`/eventos?${q}`:'/eventos')
  }

  return <form className="event-filters" onSubmit={apply}>
    <div className="event-filter-title"><Filter size={17}/><div><b>FILTRAR EVENTOS</b><small>Encontre o rolê certo para você.</small></div></div>
    <div className="event-filter-grid">
      <label>Estado<input value={state} onChange={e=>setState(e.target.value.slice(0,2))} placeholder="SC" maxLength={2}/></label>
      <label>Cidade<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Florianópolis"/></label>
      <label>Data<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      <label>Categoria<select value={category} onChange={e=>setCategory(e.target.value)}>{EVENT_CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Distância<select value={radius} onChange={e=>setRadius(e.target.value)} disabled={!hasGeo}>{RADII.map(([v,l])=><option value={v} key={l}>{l}</option>)}</select></label>
    </div>
    <div className="event-filter-actions">
      <button className="event-filter-apply" type="submit">APLICAR FILTROS</button>
      <button className="event-near-me" type="button" onClick={nearMe}><Crosshair size={15}/> EVENTOS PERTO DE MIM</button>
      {hasGeo?<button className="event-location-clear" type="button" onClick={clearGeo}>BRASIL INTEIRO</button>:null}
      <button className="event-filter-clear" type="button" onClick={()=>router.push('/eventos')}><RotateCcw size={14}/> LIMPAR</button>
    </div>
    {geoMsg?<p className="event-geo-message">{geoMsg}</p>:null}
  </form>
}
