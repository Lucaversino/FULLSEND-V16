'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapPin, Search } from 'lucide-react'

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function SearchBar({
  target = '/explorar',
  initialQuery = '',
  initialCategory = '',
  initialState = '',
  initialCity = '',
}:{
  target?: string
  initialQuery?: string
  initialCategory?: string
  initialState?: string
  initialCity?: string
}){
  const [q,setQ] = useState(initialQuery)
  const [cat,setCat] = useState(initialCategory)
  const [state,setState] = useState(initialState)
  const [city,setCity] = useState(initialCity)
  const [cities,setCities] = useState<string[]>(initialCity ? [initialCity] : [])
  const [loadingCities,setLoadingCities] = useState(false)
  const router = useRouter()
  const currentParams = useSearchParams()

  useEffect(()=>{
    let alive = true
    if(!state){
      setCities([])
      setCity('')
      return
    }

    setLoadingCities(true)

    fetch(`/api/locations/cities?state=${encodeURIComponent(state)}`,{cache:'force-cache'})
      .then(r=>r.ok ? r.json() : Promise.reject(new Error('Falha ao carregar cidades')))
      .then(j=>{
        if(!alive)return
        const list = Array.isArray(j?.cities) ? j.cities : []
        setCities(list)
        setCity(prev=>list.includes(prev) ? prev : '')
      })
      .catch(()=>{
        if(!alive)return
        setCities(initialCity ? [initialCity] : [])
        setCity(initialCity || '')
      })
      .finally(()=>{
        if(alive)setLoadingCities(false)
      })

    return()=>{alive=false}
  },[state, initialCity])

  function navigate() {
    const sp = new URLSearchParams()
    const queryText = q.trim()

    if (queryText) sp.set('q', queryText)
    if (cat) sp.set('categoria', cat)
    if (state) sp.set('estado', state)
    if (city) sp.set('cidade', city)

    const query = sp.toString()
    router.push(query ? `${target}?${query}` : target)
  }


  function syncLocation(nextState:string,nextCity:string){
    // Mantém marca, estilo e demais filtros atuais.
    const sp = new URLSearchParams(currentParams.toString())

    if(nextState) sp.set('estado',nextState)
    else sp.delete('estado')

    if(nextCity) sp.set('cidade',nextCity)
    else sp.delete('cidade')

    // Ao mudar localização, volta para a primeira página.
    sp.delete('pagina')

    const query = sp.toString()
    router.replace(query ? `${target}?${query}` : target,{scroll:false})
  }

  return (
    <form
      className="search-shell search-shell-with-location"
      role="search"
      onSubmit={(e)=>{
        e.preventDefault()
        navigate()
      }}
    >
      <div className="search-main-row">
        <div className="search-input">
          <Search size={20}/>
          <input
            aria-label="Pesquisar anúncios"
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Digite marca, modelo, turbo, FuelTech, rodas..."
          />
        </div>

        <select
          className="field search-category"
          aria-label="Categoria"
          value={cat}
          onChange={e=>setCat(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          <option value="carros">Carros</option>
          <option value="motores">Motores & Turbo</option>
          <option value="rodas">Rodas & Pneus</option>
          <option value="suspensao">Suspensão</option>
          <option value="som">Som Automotivo</option>
          <option value="acessorios">Acessórios</option>
        </select>

        <button className="btn btn-red search-submit fs-hero-action fs-search-hero-btn" type="submit">
          <Search size={17}/> BUSCAR
        </button>
      </div>

      <div className="search-location-row">
        <div className="search-location-label">
          <MapPin size={15}/>
          <span>LOCALIZAÇÃO</span>
        </div>

        <div className="search-location-field">
          <span>ESTADO</span>
          <select
            aria-label="Estado"
            value={state}
            onChange={e=>{
              const nextState=e.target.value
              setState(nextState)
              setCity('')
              syncLocation(nextState,'')
            }}
          >
            <option value="">Todo o Brasil</option>
            {STATES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="search-location-field search-location-city">
          <span>CIDADE</span>
          <select
            aria-label="Cidade"
            value={city}
            onChange={e=>setCity(e.target.value)}
            disabled={!state || loadingCities}
          >
            <option value="">
              {!state
                ? 'Selecione o estado primeiro'
                : loadingCities
                  ? 'Carregando cidades...'
                  : 'Todas as cidades'}
            </option>
            {cities.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {(state || city) ? (
          <button
            type="button"
            className="search-location-clear"
            onClick={()=>{
              setState('')
              setCity('')
              syncLocation('','')
            }}
          >
            LIMPAR
          </button>
        ) : null}
      </div>
    </form>
  )
}
