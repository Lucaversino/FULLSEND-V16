'use client'

import { useEffect, useState } from 'react'

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

type Props = {
  stateName?: string
  cityName?: string
  defaultState?: string
  defaultCity?: string
  className?: string
}

export default function StateCitySelect({
  stateName='estado',
  cityName='cidade',
  defaultState='',
  defaultCity='',
  className='',
}:Props){
  const [state,setState]=useState(defaultState)
  const [city,setCity]=useState(defaultCity)
  const [cities,setCities]=useState<string[]>(defaultCity?[defaultCity]:[])
  const [loading,setLoading]=useState(false)

  useEffect(()=>{
    let alive=true
    if(!state){setCities([]);setCity('');return}
    setLoading(true)
    fetch(`/api/locations/cities?state=${encodeURIComponent(state)}`,{cache:'force-cache'})
      .then(r=>r.ok?r.json():Promise.reject(new Error('Falha ao carregar cidades')))
      .then(j=>{
        if(!alive)return
        const list=Array.isArray(j?.cities)?j.cities:[]
        setCities(list)
        setCity(prev=>list.includes(prev)?prev:'')
      })
      .catch(()=>{if(alive){setCities(defaultCity?[defaultCity]:[]);setCity(defaultCity||'')}})
      .finally(()=>{if(alive)setLoading(false)})
    return()=>{alive=false}
  },[state])

  return <div className={`state-city-select ${className}`}>
    <div className="filter-group">
      <label>Estado</label>
      <select name={stateName} value={state} onChange={e=>{setState(e.target.value);setCity('')}}>
        <option value="">Todo o Brasil</option>
        {STATES.map(s=><option key={s} value={s}>{s}</option>)}
      </select>
    </div>
    <div className="filter-group">
      <label>Cidade</label>
      <select name={cityName} value={city} onChange={e=>setCity(e.target.value)} disabled={!state||loading}>
        <option value="">{!state?'Selecione o estado primeiro':loading?'Carregando cidades...':'Todas as cidades'}</option>
        {cities.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  </div>
}
