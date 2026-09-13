'use client'

import { useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Edit3, Trash2, X, Save, UploadCloud, Image as ImageIcon, Star,
  ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Car, MapPin,
  Phone, FileText, Tag, BadgeDollarSign
} from 'lucide-react'
import { useRouter } from 'next/navigation'

type ListingMedia = { url:string; isNew?:boolean; file?:File }

const CATEGORIES=[
  ['carros','Carros'],
  ['motores','Motores & Turbo'],
  ['rodas','Rodas & Pneus'],
  ['suspensao','Suspensão'],
  ['som','Som Automotivo'],
  ['acessorios','Acessórios'],
]

function normalizeMedia(value:any, cover?:string|null){
  const list=Array.isArray(value)?value.filter((x:any)=>typeof x==='string'&&x.trim()):[]
  const urls=cover && !list.includes(cover)?[cover,...list]:list
  return urls.slice(0,15).map((url:string)=>({url})) as ListingMedia[]
}

function storagePathFromPublicUrl(url:string){
  const marker='/storage/v1/object/public/listing-media/'
  const idx=url.indexOf(marker)
  if(idx<0)return null
  return decodeURIComponent(url.slice(idx+marker.length).split('?')[0])
}

export default function UserListingActions({listing}:{listing:any}){
  const [editing,setEditing]=useState(false)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [success,setSuccess]=useState('')
  const [dirty,setDirty]=useState(false)
  const [media,setMedia]=useState<ListingMedia[]>(()=>normalizeMedia(listing.media,listing.cover_url))
  const [removedUrls,setRemovedUrls]=useState<string[]>([])
  const fileRef=useRef<HTMLInputElement|null>(null)
  const router=useRouter()

  const originalMedia=useMemo(()=>normalizeMedia(listing.media,listing.cover_url),[listing.media,listing.cover_url])

  function openEditor(){
    setMedia(originalMedia)
    setRemovedUrls([])
    setMessage('')
    setSuccess('')
    setDirty(false)
    setEditing(true)
  }

  function requestClose(){
    if(busy)return
    if(dirty&&!window.confirm('Existem alterações não salvas. Deseja realmente sair?'))return
    setEditing(false)
  }

  function removeMedia(index:number){
    setMedia(current=>{
      const item=current[index]
      if(item&&!item.isNew)setRemovedUrls(r=>r.includes(item.url)?r:[...r,item.url])
      return current.filter((_,i)=>i!==index)
    })
    setDirty(true)
  }

  function moveMedia(index:number,direction:-1|1){
    setMedia(current=>{
      const target=index+direction
      if(target<0||target>=current.length)return current
      const copy=[...current]
      ;[copy[index],copy[target]]=[copy[target],copy[index]]
      return copy
    })
    setDirty(true)
  }

  function addFiles(files:FileList|null){
    if(!files)return
    const incoming=Array.from(files).filter(f=>f.size>0&&f.size<=20*1024*1024)
    setMedia(current=>{
      const room=Math.max(0,15-current.length)
      const next=incoming.slice(0,room).map(file=>({
        url:URL.createObjectURL(file),
        file,
        isNew:true,
      }))
      return [...current,...next]
    })
    setDirty(true)
    if(fileRef.current)fileRef.current.value=''
  }

  async function save(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    if(busy)return
    setBusy(true);setMessage('');setSuccess('')

    try{
      const form=e.currentTarget
      const fd=new FormData(form)
      const title=String(fd.get('title')||'').trim()
      const description=String(fd.get('description')||'').trim()
      const category_slug=String(fd.get('category_slug')||'').trim()
      const priceText=String(fd.get('price')||'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.')
      const price=priceText?Number(priceText):0
      const city=String(fd.get('city')||'').trim()
      const state=String(fd.get('state')||'').trim().toUpperCase().slice(0,2)
      const whatsapp=String(fd.get('whatsapp')||'').trim()
      const status=String(fd.get('status')||'active')
      const tags=String(fd.get('tags')||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean).slice(0,12)
      const isCar=category_slug==='carros'
      const brand=String(fd.get('brand')||'').trim()
      const model=String(fd.get('model')||'').trim()
      const yearText=String(fd.get('year')||'').trim()
      const mileageText=String(fd.get('mileage')||'').trim()
      const year=yearText?Number(yearText):null
      const mileage=mileageText?Number(mileageText):null
      const vehicle_styles=fd.getAll('vehicle_styles').map(x=>String(x)).filter(Boolean)
      const fuel=String(fd.get('fuel')||'').trim()||null
      const transmission=String(fd.get('transmission')||'').trim()||null
      const color=String(fd.get('color')||'').trim()||null
      const body_type=String(fd.get('body_type')||'').trim()||null
      const engine=String(fd.get('engine')||'').trim()||null
      const powerText=String(fd.get('power_cv')||'').trim()
      const doorsText=String(fd.get('doors')||'').trim()
      const power_cv=powerText?Number(powerText):null
      const doors=doorsText?Number(doorsText):null
      const condition=String(fd.get('condition')||'').trim()||null
      const features=String(fd.get('features')||'').trim()||null

      if(!title){throw new Error('Informe o título do anúncio.')}
      if(!category_slug){throw new Error('Selecione a categoria.')}
      if(!Number.isFinite(price)||price<0){throw new Error('Informe um preço válido.')}
      if(!city){throw new Error('Informe a cidade.')}
      if(state.length!==2){throw new Error('Informe uma UF válida com 2 letras.')}
      if(!whatsapp){throw new Error('Informe o WhatsApp de contato.')}
      if(!['active','draft','sold'].includes(status)){throw new Error('Status inválido.')}

      const supabase=createClient()
      const {data:{user}}=await supabase.auth.getUser()
      if(!user)throw new Error('Sua sessão expirou. Entre novamente.')

      const uploaded:ListingMedia[]=[]
      for(const item of media){
        if(!item.isNew||!item.file){uploaded.push(item);continue}
        const f=item.file
        const safeName=f.name.replace(/[^a-zA-Z0-9._-]/g,'_')
        const path=`${user.id}/${crypto.randomUUID()}-${safeName}`
        const {error:uploadError}=await supabase.storage.from('listing-media').upload(path,f,{upsert:false})
        if(uploadError)throw new Error(`Falha ao enviar ${f.name}: ${uploadError.message}`)
        const {data}=supabase.storage.from('listing-media').getPublicUrl(path)
        uploaded.push({url:data.publicUrl})
      }

      const mediaUrls=uploaded.map(x=>x.url).slice(0,15)
      const payload={
        title,
        description,
        category_slug,
        price,
        city,
        state,
        whatsapp,
        tags,
        status,
        brand:isCar?brand:null,
        model:isCar?model:null,
        year:isCar?year:null,
        mileage:isCar?mileage:null,
        fuel:isCar?fuel:null,
        transmission:isCar?transmission:null,
        vehicle_styles:isCar?vehicle_styles:[],
        color:isCar?color:null,
        body_type:isCar?body_type:null,
        engine:isCar?engine:null,
        power_cv:isCar?power_cv:null,
        doors:isCar?doors:null,
        condition:isCar?condition:null,
        features,
        cover_url:mediaUrls[0]||null,
        media:mediaUrls,
        updated_at:new Date().toISOString(),
      }

      const {data:updated,error}=await supabase
        .from('listings')
        .update(payload)
        .eq('id',listing.id)
        .eq('user_id',user.id)
        .select('id')
        .maybeSingle()

      if(error)throw new Error(error.message)
      if(!updated)throw new Error('Não foi possível atualizar este anúncio. Verifique se ele pertence à sua conta.')

      const removePaths=removedUrls.map(storagePathFromPublicUrl).filter(Boolean) as string[]
      if(removePaths.length)await supabase.storage.from('listing-media').remove(removePaths)

      setMedia(uploaded)
      setRemovedUrls([])
      setDirty(false)
      setSuccess('Anúncio atualizado com sucesso.')
      router.refresh()
      setTimeout(()=>setEditing(false),900)
    }catch(err){
      setMessage(err instanceof Error?err.message:'Não foi possível salvar as alterações.')
    }finally{
      setBusy(false)
    }
  }

  async function remove(){
    if(busy)return
    if(!window.confirm('Excluir este anúncio definitivamente?'))return
    setBusy(true);setMessage('')
    const supabase=createClient()
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setBusy(false);setMessage('Sua sessão expirou.');return}
    const {error}=await supabase.from('listings').delete().eq('id',listing.id).eq('user_id',user.id)
    setBusy(false)
    if(error){setMessage(error.message);return}
    router.refresh()
  }

  return <>
    <div className="user-ad-actions">
      <button type="button" onClick={openEditor}><Edit3 size={14}/> EDITAR</button>
      <button type="button" className="danger" onClick={remove} disabled={busy}><Trash2 size={14}/> EXCLUIR</button>
    </div>
    {message&&!editing?<div className="user-ad-error">{message}</div>:null}

    {editing?(
      <div className="user-edit-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)requestClose()}}>
        <form className="user-edit-modal user-edit-modal-pro" onSubmit={save} onChange={()=>setDirty(true)}>
          <div className="user-edit-head user-edit-head-pro">
            <div className="user-edit-title-wrap">
              <div className="user-edit-cover-mini">
                {media[0]?.url?<img src={media[0].url} alt=""/>:<Car size={24}/>}
              </div>
              <div><span>MINHA GARAGEM • EDITOR COMPLETO</span><h3>EDITAR ANÚNCIO</h3><p>Atualize todas as informações públicas do seu anúncio.</p></div>
            </div>
            <button type="button" onClick={requestClose} aria-label="Fechar"><X size={18}/></button>
          </div>

          <div className="user-edit-scroll">
            <section className="user-edit-section">
              <div className="user-edit-section-head"><FileText size={17}/><div><b>DADOS PRINCIPAIS</b><small>Título, categoria, descrição e preço.</small></div></div>
              <div className="user-edit-grid two">
                <label className="wide">Título do anúncio<input name="title" defaultValue={listing.title||''} required maxLength={120}/></label>
                <label>Categoria<select name="category_slug" defaultValue={listing.category_slug||''} required>{CATEGORIES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
                <label><span className="label-icon"><BadgeDollarSign size={13}/> Preço</span><input name="price" inputMode="decimal" defaultValue={listing.price!==null&&listing.price!==undefined?String(Number(listing.price).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:2})):''} placeholder="135.000" required/></label>
                <label className="wide">Descrição<textarea name="description" defaultValue={listing.description||''} rows={7} maxLength={5000} placeholder="Descreva o veículo, preparação, estado, documentação e diferenciais."/></label>
              </div>
            </section>

            <section className="user-edit-section">
              <div className="user-edit-section-head"><Tag size={17}/><div><b>TAGS E BUSCA</b><small>Palavras que ajudam seu anúncio a ser encontrado.</small></div></div>
              <label>Tags (até 8, separadas por vírgula)<input name="tags" defaultValue={Array.isArray(listing.tags)?listing.tags.join(', '):''} placeholder="TURBO, FUELTECH, FORJADO"/></label>
            </section>

            {listing.category_slug==='carros'?<section className="user-edit-section">
              <div className="user-edit-section-head"><Car size={17}/><div><b>FICHA TÉCNICA DO VEÍCULO</b><small>Dados usados na pesquisa e nos filtros do marketplace.</small></div></div>
              <div className="user-edit-grid three">
                <label>Marca<input name="brand" defaultValue={listing.brand||''} required/></label>
                <label>Modelo<input name="model" defaultValue={listing.model||''} required/></label>
                <label>Ano<input name="year" type="number" min="1900" max="2100" defaultValue={listing.year??''} required/></label>
                <label>Quilometragem<input name="mileage" type="number" min="0" defaultValue={listing.mileage??''} required/></label>
                <label>Combustível<select name="fuel" defaultValue={listing.fuel||''}><option value="">Selecione</option><option>Gasolina</option><option>Flex</option><option>Etanol</option><option>Diesel</option><option>Elétrico</option><option>Híbrido</option><option>GNV</option></select></label>
                <label>Câmbio<select name="transmission" defaultValue={listing.transmission||''}><option value="">Selecione</option><option>Manual</option><option>Automático</option><option>Automatizado</option><option>CVT</option><option>DCT</option></select></label>
                <label>Cor<input name="color" defaultValue={listing.color||''}/></label>
                <label>Carroceria<input name="body_type" defaultValue={listing.body_type||''}/></label>
                <label>Motor<input name="engine" defaultValue={listing.engine||''}/></label>
                <label>Potência (cv)<input name="power_cv" type="number" min="0" defaultValue={listing.power_cv??''}/></label>
                <label>Portas<input name="doors" type="number" min="2" max="6" defaultValue={listing.doors??''}/></label>
                <label>Estado geral<input name="condition" defaultValue={listing.condition||''}/></label>
                <div className="wide user-edit-style-options">
                  <span>Estilo do veículo</span>
                  <label><input type="checkbox" name="vehicle_styles" value="rebaixado" defaultChecked={Array.isArray(listing.vehicle_styles)&&listing.vehicle_styles.includes('rebaixado')}/><b>REBAIXADO</b></label>
                  <label><input type="checkbox" name="vehicle_styles" value="turbo" defaultChecked={Array.isArray(listing.vehicle_styles)&&listing.vehicle_styles.includes('turbo')}/><b>TURBO</b></label>
                  <label><input type="checkbox" name="vehicle_styles" value="antigo" defaultChecked={Array.isArray(listing.vehicle_styles)&&listing.vehicle_styles.includes('antigo')}/><b>ANTIGO</b></label>
                </div>
                <label className="wide">Equipamentos e modificações<textarea name="features" defaultValue={listing.features||''} rows={4}/></label>
              </div>
            </section>:null}

            <section className="user-edit-section">
              <div className="user-edit-section-head"><ImageIcon size={17}/><div><b>FOTOS E VÍDEOS</b><small>Até 15 arquivos. O primeiro item é a capa do anúncio.</small></div></div>
              <div className="user-edit-media-grid">
                {media.map((item,index)=><div className={`user-edit-media ${index===0?'cover':''}`} key={`${item.url}-${index}`}>
                  {item.file?.type.startsWith('video/')||/\.(mp4|webm)(\?|$)/i.test(item.url)?<video src={item.url} muted/>:<img src={item.url} alt={`Mídia ${index+1}`}/>}
                  {index===0?<span className="user-edit-cover-badge"><Star size={11}/> CAPA</span>:null}
                  <div className="user-edit-media-actions">
                    <button type="button" disabled={index===0} onClick={()=>moveMedia(index,-1)} aria-label="Mover para esquerda"><ArrowLeft size={14}/></button>
                    <button type="button" disabled={index===media.length-1} onClick={()=>moveMedia(index,1)} aria-label="Mover para direita"><ArrowRight size={14}/></button>
                    <button type="button" className="danger" onClick={()=>removeMedia(index)} aria-label="Remover"><Trash2 size={14}/></button>
                  </div>
                </div>)}
                {media.length<15?<button type="button" className="user-edit-add-media" onClick={()=>fileRef.current?.click()}><UploadCloud size={26}/><b>ADICIONAR MÍDIA</b><small>{media.length}/15 arquivos</small></button>:null}
              </div>
              <input ref={fileRef} className="user-edit-file-input" type="file" accept="image/*,video/*" multiple onChange={e=>addFiles(e.target.files)}/>
            </section>

            <section className="user-edit-section">
              <div className="user-edit-section-head"><MapPin size={17}/><div><b>LOCALIZAÇÃO E CONTATO</b><small>Dados exibidos para interessados.</small></div></div>
              <div className="user-edit-grid location">
                <label>Cidade<input name="city" defaultValue={listing.city||''} required/></label>
                <label>UF<input name="state" maxLength={2} defaultValue={listing.state||''} required/></label>
                <label><span className="label-icon"><Phone size={13}/> WhatsApp</span><input name="whatsapp" inputMode="tel" defaultValue={listing.whatsapp||''} placeholder="47999999999" required/></label>
              </div>
            </section>

            <section className="user-edit-section">
              <div className="user-edit-section-head"><CheckCircle2 size={17}/><div><b>STATUS DO ANÚNCIO</b><small>Controle se ele está publicado, pausado ou vendido.</small></div></div>
              <div className="user-edit-status-options">
                <label><input type="radio" name="status" value="active" defaultChecked={listing.status==='active'}/><span><b>ATIVO</b><small>Visível no marketplace</small></span></label>
                <label><input type="radio" name="status" value="draft" defaultChecked={listing.status==='draft'}/><span><b>PAUSADO</b><small>Oculto temporariamente</small></span></label>
                <label><input type="radio" name="status" value="sold" defaultChecked={listing.status==='sold'}/><span><b>VENDIDO</b><small>Marca o anúncio como vendido</small></span></label>
              </div>
              <div className="user-edit-promo-note"><AlertTriangle size={15}/><span>VIP e DESTAQUE não podem ser ativados por este editor. Promoções continuam protegidas pelo fluxo de pagamento.</span></div>
            </section>
          </div>

          {message?<div className="user-edit-feedback error">{message}</div>:null}
          {success?<div className="user-edit-feedback success"><CheckCircle2 size={15}/>{success}</div>:null}

          <div className="user-edit-footer">
            <button type="button" className="user-edit-cancel" onClick={requestClose} disabled={busy}>CANCELAR</button>
            <button className="user-edit-save" disabled={busy}><Save size={15}/>{busy?' SALVANDO...':' SALVAR ALTERAÇÕES'}</button>
          </div>
        </form>
      </div>
    ):null}
  </>
}
