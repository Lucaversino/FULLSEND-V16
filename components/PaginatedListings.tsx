'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import ListingCard from '@/components/ListingCard'
import type { UnifiedListing } from '@/lib/listings'

function visiblePages(current:number,total:number) {
  if (total <= 7) return Array.from({length:total},(_,i)=>i+1)
  const pages = new Set<number>([1,total,current-1,current,current+1])
  if (current <= 4) [2,3,4,5].forEach(n=>pages.add(n))
  if (current >= total-3) [total-4,total-3,total-2,total-1].forEach(n=>pages.add(n))
  return [...pages].filter(n=>n>=1&&n<=total).sort((a,b)=>a-b)
}

function SkeletonGrid({count=15}:{count?:number}) {
  return <div className="listing-grid explore-grid listing-skeleton-grid" aria-label="Carregando anúncios">
    {Array.from({length:count},(_,i)=><div className="listing-card listing-skeleton-card" key={i} aria-hidden="true">
      <div className="listing-skeleton-media"/>
      <div className="listing-skeleton-body">
        <span/><span/><span/><span/>
      </div>
    </div>)}
  </div>
}

export default function PaginatedListings({
  items,
  total,
  currentPage,
  totalPages,
  pageSize,
  randomSeed,
}:{
  items:UnifiedListing[]
  total:number
  currentPage:number
  totalPages:number
  pageSize:number
  randomSeed?:string
}){
  const router=useRouter()
  const pathname=usePathname()
  const searchParams=useSearchParams()
  const [loading,setLoading]=useState(false)
  const [isPending,startTransition]=useTransition()

  useEffect(()=>setLoading(false),[currentPage,items])

  const pages=useMemo(()=>visiblePages(currentPage,totalPages),[currentPage,totalPages])
  const from=total ? (currentPage-1)*pageSize+1 : 0
  const to=total ? Math.min(currentPage*pageSize,total) : 0

  function go(page:number){
    if(page<1||page>totalPages||page===currentPage)return
    const sp=new URLSearchParams(searchParams.toString())
    sp.delete('pagina')
    if(randomSeed)sp.set('seed',randomSeed)
    else sp.delete('seed')
    if(page<=1)sp.delete('page')
    else sp.set('page',String(page))
    const query=sp.toString()
    const href=query?`${pathname}?${query}#resultados`:`${pathname}#resultados`
    setLoading(true)
    document.getElementById('resultados')?.scrollIntoView({behavior:'smooth',block:'start'})
    startTransition(()=>router.push(href,{scroll:false}))
  }

  const showLoading=loading||isPending

  return <>
    <div className="results-range-summary">
      <strong>{total.toLocaleString('pt-BR')} anúncios encontrados</strong>
      <span>{total ? `Mostrando ${from.toLocaleString('pt-BR')}–${to.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')}` : 'Nenhum anúncio encontrado'}</span>
    </div>

    {showLoading ? <SkeletonGrid count={pageSize}/> : <div className="listing-grid explore-grid">{items.map(x=><ListingCard key={`${x.kind}-${x.id}`} x={x}/>)}</div>}

    {totalPages>1?<nav className="manual-pagination real-pagination" aria-label="Paginação dos anúncios">
      <button type="button" className={`page-arrow ${currentPage===1?'disabled':''}`} disabled={currentPage===1||showLoading} onClick={()=>go(currentPage-1)} aria-label="Página anterior">‹</button>

      <div className="page-numbers desktop-page-numbers">
        {pages.map((n,i)=>{
          const prev=pages[i-1]
          return <span key={n} className="page-slot">
            {prev&&n-prev>1?<span className="page-ellipsis">…</span>:null}
            <button type="button" className={`page-number ${n===currentPage?'active':''}`} onClick={()=>go(n)} disabled={showLoading} aria-current={n===currentPage?'page':undefined}>{n}</button>
          </span>
        })}
      </div>

      <div className="mobile-page-status">Página {currentPage} de {totalPages}</div>
      <button type="button" className={`page-arrow ${currentPage===totalPages?'disabled':''}`} disabled={currentPage===totalPages||showLoading} onClick={()=>go(currentPage+1)} aria-label="Próxima página">›</button>
    </nav>:null}
  </>
}
