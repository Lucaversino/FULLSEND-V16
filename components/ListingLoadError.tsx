'use client'

import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function ListingLoadError({message}:{message?:string|null}){
  const router=useRouter()
  return <div className="data-warning listing-load-error">
    <strong>Não foi possível carregar os anúncios.</strong>
    <span>{message || 'Tente novamente em alguns instantes.'}</span>
    <button type="button" className="btn btn-red" onClick={()=>router.refresh()}><RefreshCw size={15}/> TENTAR NOVAMENTE</button>
  </div>
}
