'use client'

import {useEffect,useRef,useState} from 'react'
import {useRouter} from 'next/navigation'
import {BadgeDollarSign,CheckCircle2,X} from 'lucide-react'
import AnnounceForm from './AnnounceForm'
import './garage-sale.css'

export default function SellGarageVehicle({vehicleId}:{vehicleId:string}){
  const dialog=useRef<HTMLDialogElement>(null)
  const [open,setOpen]=useState(false)
  const [busy,setBusy]=useState(false)
  const [data,setData]=useState<any>(null)
  const [error,setError]=useState('')
  const [attempt,setAttempt]=useState(0)
  const [published,setPublished]=useState<{id:string;slug:string}|null>(null)
  const router=useRouter()
  useEffect(()=>{
    if(!open)return
    dialog.current?.showModal()
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    return ()=>{document.body.style.overflow=previous}
  },[open])
  useEffect(()=>{
    if(!open)return
    const controller=new AbortController()
    setData(null);setError('')
    fetch(`/api/garage/sale?vehicleId=${encodeURIComponent(vehicleId)}`,{cache:'no-store',signal:controller.signal})
      .then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível carregar seu carro.');return result})
      .then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message)})
    return ()=>controller.abort()
  },[open,attempt,vehicleId])
  function close(){
    if(busy)return
    if(data&&!data.existing&&!published&&!confirm('Fechar a criação do anúncio? As alterações deste formulário serão descartadas.'))return
    setOpen(false);setPublished(null)
  }
  const listing=published||data?.existing
  return <>
    <button className="garage-sell-button" type="button" onClick={()=>setOpen(true)}><BadgeDollarSign size={18}/> VENDER MEU CARRO</button>
    {open&&<dialog ref={dialog} className="garage-sale-dialog" aria-labelledby="garage-sale-title" onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===e.currentTarget)close()}}>
      <div className="garage-sale-content">
        <header className="garage-sale-header"><div><span>DA SUA GARAGEM PARA OS CLASSIFICADOS</span><h2 id="garage-sale-title">Vender meu carro</h2></div><button type="button" aria-label="Fechar" disabled={busy} onClick={close}><X/></button></header>
        {error?<div role="alert" className="garage-sale-state"><p>{error}</p><button className="btn" onClick={()=>setAttempt(x=>x+1)}>Tentar novamente</button></div>:!data?<p className="garage-sale-state" role="status">Carregando os dados do seu carro...</p>:listing?<div className="garage-sale-state"><CheckCircle2 size={42}/><h3>{published?'Anúncio publicado!':'Este carro já tem um anúncio'}</h3><p>{published?'Seu carro já está nos classificados. A garagem e o histórico do projeto continuam preservados.':'Você pode consultar o anúncio ou gerenciá-lo no seu painel.'}</p><a className="btn btn-primary" href={`/anuncio/${listing.slug}`}>Ver anúncio</a> <a className="btn" href="/perfil">Gerenciar meus anúncios</a></div>:<>
          <div className="garage-sale-intro"><strong>{data.vehicle.title}</strong><p>Dados e fotos já preenchidos. Revise as informações, informe o preço e confirme a publicação. Seu projeto continuará na garagem.</p></div>
          <AnnounceForm garageVehicle={data.vehicle} defaults={{whatsapp:data.whatsapp}} onBusyChange={setBusy} onPublished={listing=>{setPublished(listing);router.refresh()}}/>
        </>}
      </div>
    </dialog>}
  </>
}
