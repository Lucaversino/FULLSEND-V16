'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  UploadCloud, ShieldCheck, Car, Gauge, CalendarDays, Fuel, Settings2,
  Palette, Wrench, Zap, MapPin, Phone, BadgeDollarSign, FileText,
  CheckCircle2, Image as ImageIcon, X
} from 'lucide-react'

const CATEGORIES=[
  ['carros','Carros'],
  ['motores','Motores & Turbo'],
  ['rodas','Rodas & Pneus'],
  ['suspensao','Suspensão'],
  ['som','Som Automotivo'],
  ['acessorios','Acessórios'],
] as const

const VEHICLE_STYLES=[
  ['rebaixado','REBAIXADO','Suspensão baixa, fixa, rosca, ar ou stance'],
  ['turbo','TURBO','Turbo original ou preparado'],
  ['antigo','ANTIGO','Clássico, antigo ou projeto retrô'],
] as const

const FUELS=['Gasolina','Flex','Etanol','Diesel','Elétrico','Híbrido','GNV']
const TRANSMISSIONS=['Manual','Automático','Automatizado','CVT','DCT']
const BODY_TYPES=['Hatch','Sedan','SUV','Picape','Cupê','Conversível','Perua','Van','Utilitário','Outro']
const CONDITIONS=['Excelente','Muito bom','Bom','Projeto em andamento','Precisa de reparos']

function cleanNumber(v:FormDataEntryValue|null){
  const n=Number(String(v||'').replace(/[^\d.-]/g,''))
  return Number.isFinite(n)?n:null
}

export default function AnnounceForm({defaults}:{defaults?:{city?:string;state?:string;whatsapp?:string}}){
  const [msg,setMsg]=useState('')
  const [busy,setBusy]=useState(false)
  const [category,setCategory]=useState('carros')
  const [styles,setStyles]=useState<string[]>([])
  const [files,setFiles]=useState<File[]>([])
  const inputRef=useRef<HTMLInputElement|null>(null)
  const router=useRouter()

  const previews=useMemo(()=>files.map(file=>({file,url:URL.createObjectURL(file)})),[files])

  function toggleStyle(value:string){
    setStyles(current=>current.includes(value)?current.filter(x=>x!==value):[...current,value])
  }

  function selectFiles(list:FileList|null){
    if(!list)return
    const valid=Array.from(list).filter(f=>f.size>0&&f.size<=20*1024*1024)
    setFiles(current=>[...current,...valid].slice(0,15))
    if(inputRef.current)inputRef.current.value=''
  }

  function removeFile(index:number){
    setFiles(current=>current.filter((_,i)=>i!==index))
  }

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    if(busy)return

    setBusy(true)
    setMsg('Validando anúncio...')

    try{
      const form=e.currentTarget
      const fd=new FormData(form)
      const supabase=createClient()
      const {data:{user}}=await supabase.auth.getUser()

      if(!user){
        router.push('/login?next=/anunciar')
        return
      }

      const title=String(fd.get('title')||'').trim()
      const description=String(fd.get('description')||'').trim()
      const price=cleanNumber(fd.get('price'))
      const city=String(fd.get('city')||'').trim()
      const state=String(fd.get('state')||'').trim().toUpperCase().slice(0,2)
      const whatsapp=String(fd.get('whatsapp')||'').trim()
      const category_slug=String(fd.get('category_slug')||'').trim()

      if(!title)throw new Error('Informe o título do anúncio.')
      if(!description)throw new Error('Descreva o anúncio.')
      if(price===null||price<0)throw new Error('Informe um preço válido.')
      if(!city)throw new Error('Informe a cidade.')
      if(state.length!==2)throw new Error('Informe uma UF válida.')
      if(!whatsapp)throw new Error('Informe o WhatsApp.')
      if(!category_slug)throw new Error('Selecione a categoria.')

      const isCar=category_slug==='carros'
      const brand=String(fd.get('brand')||'').trim()
      const model=String(fd.get('model')||'').trim()
      const year=cleanNumber(fd.get('year'))
      const mileage=cleanNumber(fd.get('mileage'))

      if(isCar){
        if(!brand)throw new Error('Informe a marca do veículo.')
        if(!model)throw new Error('Informe o modelo do veículo.')
        if(year===null||year<1900||year>2100)throw new Error('Informe um ano válido.')
        if(mileage===null||mileage<0)throw new Error('Informe a quilometragem.')
      }

      setMsg('Enviando fotos e vídeos...')
      const media:string[]=[]
      for(const f of files.slice(0,15)){
        const safe=f.name.replace(/[^a-zA-Z0-9._-]/g,'_')
        const path=`${user.id}/${crypto.randomUUID()}-${safe}`
        const {error}=await supabase.storage.from('listing-media').upload(path,f,{upsert:false})
        if(error)throw new Error(`Falha ao enviar ${f.name}: ${error.message}`)
        const {data}=supabase.storage.from('listing-media').getPublicUrl(path)
        media.push(data.publicUrl)
      }

      const slug=`${title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${Date.now().toString().slice(-7)}`

      const payload={
        user_id:user.id,
        title,
        slug,
        description,
        price,
        category_slug,
        city,
        state,
        whatsapp,
        cover_url:media[0]||null,
        media,
        tags:String(fd.get('tags')||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean).slice(0,12),
        source:'fullsend',
        status:'active',

        brand:isCar?brand:null,
        model:isCar?model:null,
        year:isCar?year:null,
        mileage:isCar?mileage:null,
        fuel:isCar?String(fd.get('fuel')||'').trim()||null:null,
        transmission:isCar?String(fd.get('transmission')||'').trim()||null:null,
        vehicle_styles:isCar?styles:[],
        color:isCar?String(fd.get('color')||'').trim()||null:null,
        body_type:isCar?String(fd.get('body_type')||'').trim()||null:null,
        engine:isCar?String(fd.get('engine')||'').trim()||null:null,
        power_cv:isCar?cleanNumber(fd.get('power_cv')):null,
        doors:isCar?cleanNumber(fd.get('doors')):null,
        condition:isCar?String(fd.get('condition')||'').trim()||null:null,
        features:String(fd.get('features')||'').trim()||null,
      }

      setMsg('Publicando anúncio...')
      const {error}=await supabase.from('listings').insert(payload)
      if(error)throw new Error(error.message)

      setMsg('Anúncio publicado com sucesso.')
      router.push('/perfil')
      router.refresh()
    }catch(err){
      setMsg(err instanceof Error?err.message:'Não foi possível publicar o anúncio.')
    }finally{
      setBusy(false)
    }
  }

  return <form onSubmit={submit} className="announce-form announce-form-pro">
    <section className="announce-pro-section">
      <div className="announce-pro-head">
        <span>01</span>
        <div><h3>CATEGORIA DO ANÚNCIO</h3><p>Escolha a categoria correta para o anúncio aparecer nos filtros certos.</p></div>
      </div>

      <label className="announce-pro-label">
        Categoria
        <select name="category_slug" className="field" required value={category} onChange={e=>setCategory(e.target.value)}>
          {CATEGORIES.map(([value,label])=><option value={value} key={value}>{label}</option>)}
        </select>
      </label>

      {category==='carros'?<div className="announce-style-block">
        <div className="announce-style-title"><Car size={17}/><div><b>TIPO / ESTILO DO CARRO</b><small>Pode selecionar mais de um. Isso sincroniza com os filtros REBAIXADO, TURBO e ANTIGO.</small></div></div>
        <div className="announce-style-grid">
          {VEHICLE_STYLES.map(([value,label,desc])=><button type="button" key={value} onClick={()=>toggleStyle(value)} className={styles.includes(value)?'active':''}>
            <span>{value==='turbo'?<Zap/>:value==='rebaixado'?<Gauge/>:<Car/>}</span>
            <b>{label}</b>
            <small>{desc}</small>
            <em>{styles.includes(value)?'SELECIONADO':'SELECIONAR'}</em>
          </button>)}
        </div>
      </div>:null}
    </section>

    <section className="announce-pro-section">
      <div className="announce-pro-head">
        <span>02</span>
        <div><h3>INFORMAÇÕES PRINCIPAIS</h3><p>Crie um anúncio claro, completo e fácil de encontrar.</p></div>
      </div>
      <div className="announce-pro-grid two">
        <label className="wide">Título do anúncio<input className="field" name="title" placeholder={category==='carros'?'Ex.: Volkswagen Golf GTI 2.0 TSI Stage 2':'Título do produto'} required maxLength={120}/></label>
        <label><span><BadgeDollarSign size={14}/>Preço</span><input className="field" name="price" type="number" min="0" step="0.01" placeholder="Ex.: 135000" required/></label>
        <label>Tags<input className="field" name="tags" placeholder="Ex.: FUELTECH, FORJADO, ARO 18"/></label>
        <label className="wide">Descrição completa<textarea className="field" name="description" placeholder="Descreva estado, manutenção, documentação, preparação, peças instaladas, detalhes e diferenciais..." rows={6} maxLength={5000} required/></label>
      </div>
    </section>

    {category==='carros'?<section className="announce-pro-section vehicle-spec-section">
      <div className="announce-pro-head">
        <span>03</span>
        <div><h3>ESPECIFICAÇÕES DO VEÍCULO</h3><p>Esses dados serão usados nos cards, pesquisas e filtros do marketplace.</p></div>
      </div>

      <div className="announce-pro-grid three">
        <label><span><Car size={14}/>Marca</span><input className="field" name="brand" placeholder="Volkswagen" required/></label>
        <label><span><Car size={14}/>Modelo</span><input className="field" name="model" placeholder="Golf GTI" required/></label>
        <label><span><CalendarDays size={14}/>Ano</span><input className="field" name="year" type="number" min="1900" max="2100" placeholder="2017" required/></label>
        <label><span><Gauge size={14}/>Quilometragem</span><input className="field" name="mileage" type="number" min="0" step="1" placeholder="89000" required/></label>
        <label><span><Fuel size={14}/>Combustível</span><select className="field" name="fuel" required><option value="">Selecione</option>{FUELS.map(x=><option key={x}>{x}</option>)}</select></label>
        <label><span><Settings2 size={14}/>Câmbio</span><select className="field" name="transmission" required><option value="">Selecione</option>{TRANSMISSIONS.map(x=><option key={x}>{x}</option>)}</select></label>
        <label><span><Palette size={14}/>Cor</span><input className="field" name="color" placeholder="Branco"/></label>
        <label>Carroceria<select className="field" name="body_type"><option value="">Selecione</option>{BODY_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
        <label><span><Wrench size={14}/>Motor</span><input className="field" name="engine" placeholder="2.0 TSI"/></label>
        <label><span><Zap size={14}/>Potência (cv)</span><input className="field" name="power_cv" type="number" min="0" placeholder="220"/></label>
        <label>Portas<input className="field" name="doors" type="number" min="2" max="6" placeholder="4"/></label>
        <label>Estado geral<select className="field" name="condition"><option value="">Selecione</option>{CONDITIONS.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="wide">Equipamentos e modificações<textarea className="field" name="features" rows={4} placeholder="Ar condicionado, bancos de couro, rodas aro 18, suspensão a ar, FuelTech, intercooler, escape..."/></label>
      </div>
    </section>:<section className="announce-pro-section">
      <div className="announce-pro-head"><span>03</span><div><h3>DETALHES DO PRODUTO</h3><p>Informe especificações, compatibilidade e estado.</p></div></div>
      <label className="announce-pro-label">Características<textarea className="field" name="features" rows={5} placeholder="Marca, modelo, aplicação, medidas, estado, compatibilidade, potência ou outros detalhes..."/></label>
    </section>}

    <section className="announce-pro-section">
      <div className="announce-pro-head">
        <span>04</span>
        <div><h3>LOCALIZAÇÃO E CONTATO</h3><p>Informações para interessados entrarem em contato.</p></div>
      </div>
      <div className="announce-pro-grid three">
        <label><span><MapPin size={14}/>Cidade</span><input className="field" name="city" defaultValue={defaults?.city} placeholder="Cidade" required/></label>
        <label>UF<input className="field" name="state" defaultValue={defaults?.state} placeholder="SC" maxLength={2} required/></label>
        <label><span><Phone size={14}/>WhatsApp</span><input className="field" name="whatsapp" defaultValue={defaults?.whatsapp} placeholder="47999999999" required/></label>
      </div>
    </section>

    <section className="announce-pro-section">
      <div className="announce-pro-head">
        <span>05</span>
        <div><h3>FOTOS E VÍDEOS</h3><p>Até 15 arquivos. A primeira imagem será usada como capa.</p></div>
      </div>

      <div className="announce-media-grid">
        {previews.map((item,index)=><div className={`announce-media-item ${index===0?'cover':''}`} key={`${item.file.name}-${index}`}>
          {item.file.type.startsWith('video/')?<video src={item.url} muted/>:<img src={item.url} alt="Prévia"/>}
          {index===0?<b>CAPA</b>:null}
          <button type="button" onClick={()=>removeFile(index)} aria-label="Remover"><X size={14}/></button>
        </div>)}
        {files.length<15?<button type="button" className="announce-upload-card" onClick={()=>inputRef.current?.click()}>
          <UploadCloud size={30}/><b>ADICIONAR MÍDIA</b><small>{files.length}/15 arquivos</small>
        </button>:null}
      </div>
      <input ref={inputRef} className="announce-hidden-input" type="file" accept="image/*,video/*" multiple onChange={e=>selectFiles(e.target.files)}/>
      <div className="announce-media-tip"><ImageIcon size={15}/> JPG, PNG, WEBP, GIF, MP4 ou WEBM • até 20 MB por arquivo.</div>
    </section>

    <div className="announce-publish-panel">
      <div><ShieldCheck size={21}/><span><b>PUBLICAÇÃO SEGURA</b><small>O anúncio ficará vinculado à sua conta e sincronizado com o marketplace FULLSEND.</small></span></div>
      <button className="btn btn-red fs-hero-action" disabled={busy}>{busy?'PUBLICANDO...':'PUBLICAR ANÚNCIO'}</button>
    </div>

    {msg?<div className={`form-message announce-pro-message ${msg.includes('sucesso')?'success':''}`}>{msg.includes('sucesso')?<CheckCircle2 size={16}/>:null}{msg}</div>:null}
  </form>
}
