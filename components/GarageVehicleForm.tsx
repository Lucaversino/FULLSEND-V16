'use client'

import { useMemo,useRef,useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import VehicleBrandModelFields from '@/components/VehicleBrandModelFields'
import { Car, UploadCloud, X, Zap, Gauge, CalendarDays, MapPin, Wrench, Palette, Settings2, Fuel, CheckCircle2 } from 'lucide-react'

const STYLES=[
  ['rebaixado','REBAIXADO'],
  ['turbo','TURBO'],
  ['antigo','ANTIGO'],
] as const
const FUELS=['Gasolina','Flex','Etanol','Diesel','Elétrico','Híbrido','GNV']
const TRANSMISSIONS=['Manual','Automático','Automatizado','CVT','DCT']
const BODY_TYPES=['Hatch','Sedan','SUV','Picape','Cupê','Conversível','Perua','Van','Utilitário','Outro']
const CONDITIONS=['Excelente','Muito bom','Bom','Projeto em andamento','Precisa de reparos']

function n(v:FormDataEntryValue|null){
  const x=Number(String(v||'').replace(/[^\d.-]/g,''))
  return Number.isFinite(x)?x:null
}

export default function GarageVehicleForm({defaults}:{defaults?:{city?:string;state?:string}}){
  const [styles,setStyles]=useState<string[]>([])
  const [files,setFiles]=useState<File[]>([])
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')
  const inputRef=useRef<HTMLInputElement|null>(null)
  const router=useRouter()
  const previews=useMemo(()=>files.map(file=>({file,url:URL.createObjectURL(file)})),[files])

  function pick(list:FileList|null){
    if(!list)return
    const valid=Array.from(list).filter(f=>f.size>0&&f.size<=20*1024*1024)
    setFiles(cur=>[...cur,...valid].slice(0,15))
    if(inputRef.current)inputRef.current.value=''
  }

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    if(busy)return
    setBusy(true);setMsg('Preparando seu carro...')
    try{
      const fd=new FormData(e.currentTarget)
      const s=createClient()
      const {data:{user}}=await s.auth.getUser()
      if(!user){router.push('/login?next=/garagem/adicionar');return}

      const title=String(fd.get('title')||'').trim()
      const brand=String(fd.get('brand')||'').trim()
      const model=String(fd.get('model')||'').trim()
      const year=n(fd.get('year'))
      const mileage=n(fd.get('mileage'))
      const city=String(fd.get('city')||'').trim()
      const state=String(fd.get('state')||'').trim().toUpperCase().slice(0,2)

      if(!title||!brand||!model||year==null||mileage==null)throw new Error('Preencha os dados principais do carro.')
      if(!city||state.length!==2)throw new Error('Informe cidade e UF.')

      setMsg('Enviando fotos...')
      const media:string[]=[]
      for(const f of files.slice(0,15)){
        const safe=f.name.replace(/[^a-zA-Z0-9._-]/g,'_')
        const path=`${user.id}/${crypto.randomUUID()}-${safe}`
        const {error}=await s.storage.from('listing-media').upload(path,f,{upsert:false})
        if(error)throw new Error(`Falha ao enviar ${f.name}: ${error.message}`)
        media.push(s.storage.from('listing-media').getPublicUrl(path).data.publicUrl)
      }

      const payload={
        title,
        slug:`${title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${Date.now().toString().slice(-7)}`,
        description:String(fd.get('description')||'').trim(),
        city,state,brand,model,year,mileage,
        fuel:String(fd.get('fuel')||'').trim()||null,
        transmission:String(fd.get('transmission')||'').trim()||null,
        vehicle_styles:styles,
        color:String(fd.get('color')||'').trim()||null,
        body_type:String(fd.get('body_type')||'').trim()||null,
        engine:String(fd.get('engine')||'').trim()||null,
        power_cv:n(fd.get('power_cv')),
        doors:n(fd.get('doors')),
        condition:String(fd.get('condition')||'').trim()||null,
        features:String(fd.get('features')||'').trim()||null,
        tags:String(fd.get('tags')||'').split(',').map(x=>x.trim()).filter(Boolean),
        media,
      }

      const r=await fetch('/api/garage/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      const j=await r.json().catch(()=>({}))
      if(!r.ok)throw new Error(j.error||'Não foi possível adicionar o carro à garagem.')

      setMsg('Carro adicionado à sua garagem.')
      router.push('/perfil')
      router.refresh()
    }catch(err){
      setMsg(err instanceof Error?err.message:'Não foi possível salvar.')
    }finally{setBusy(false)}
  }

  return <form onSubmit={submit} className="announce-form announce-form-pro garage-vehicle-form">
    <div className="garage-mode-notice">
      <Car size={22}/>
      <div><b>CARRO / PROJETO PESSOAL</b><span>Este cadastro é para sua garagem e Comunidade. Não possui preço, WhatsApp nem botão de compra.</span></div>
    </div>

    <section className="announce-pro-section">
      <div className="announce-pro-head"><span>01</span><div><h3>IDENTIDADE DO PROJETO</h3><p>Como seu carro será apresentado para a Comunidade FULLSEND.</p></div></div>
      <div className="announce-pro-grid two">
        <label className="wide">Nome do projeto / carro<input className="field" name="title" placeholder="Ex.: Gol G4 Turbo — Projeto Street" required maxLength={120}/></label>
        <VehicleBrandModelFields/>
        <label><CalendarDays size={14}/> Ano<input className="field" name="year" type="number" min="1900" max="2100" required/></label>
        <label><Gauge size={14}/> Quilometragem<input className="field" name="mileage" type="number" min="0" required/></label>
        <label className="wide">Sobre o carro<textarea className="field" name="description" rows={5} placeholder="Conte a história do projeto, preparação atual e planos futuros..."/></label>
      </div>
      <div className="announce-style-grid">
        {STYLES.map(([v,l])=><button key={v} type="button" className={styles.includes(v)?'active':''} onClick={()=>setStyles(s=>s.includes(v)?s.filter(x=>x!==v):[...s,v])}><span>{v==='turbo'?<Zap/>:v==='rebaixado'?<Gauge/>:<Car/>}</span><b>{l}</b><em>{styles.includes(v)?'SELECIONADO':'SELECIONAR'}</em></button>)}
      </div>
    </section>

    <section className="announce-pro-section">
      <div className="announce-pro-head"><span>02</span><div><h3>CONFIGURAÇÃO DO CARRO</h3><p>Dados que ajudam outros gearheads a conhecer seu projeto.</p></div></div>
      <div className="announce-pro-grid three">
        <label><Fuel size={14}/> Combustível<select className="field" name="fuel"><option value="">Selecione</option>{FUELS.map(x=><option key={x}>{x}</option>)}</select></label>
        <label><Settings2 size={14}/> Câmbio<select className="field" name="transmission"><option value="">Selecione</option>{TRANSMISSIONS.map(x=><option key={x}>{x}</option>)}</select></label>
        <label><Palette size={14}/> Cor<input className="field" name="color"/></label>
        <label>Carroceria<select className="field" name="body_type"><option value="">Selecione</option>{BODY_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
        <label><Wrench size={14}/> Motor<input className="field" name="engine" placeholder="1.8 AP Turbo"/></label>
        <label><Zap size={14}/> Potência (cv)<input className="field" name="power_cv" type="number" min="0"/></label>
        <label>Portas<input className="field" name="doors" type="number" min="2" max="6"/></label>
        <label>Estado<select className="field" name="condition"><option value="">Selecione</option>{CONDITIONS.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="wide">Peças / modificações<textarea className="field" name="features" rows={4} placeholder="FuelTech, turbina, rodas, suspensão, freios, som..."/></label>
        <label className="wide">Tags<input className="field" name="tags" placeholder="Turbo, Projeto, Rebaixado"/></label>
      </div>
    </section>

    <section className="announce-pro-section">
      <div className="announce-pro-head"><span>03</span><div><h3>LOCALIZAÇÃO</h3><p>Somente cidade e estado. Não precisa informar endereço.</p></div></div>
      <div className="announce-pro-grid two">
        <label><MapPin size={14}/> Cidade<input className="field" name="city" defaultValue={defaults?.city} required/></label>
        <label>UF<input className="field" name="state" defaultValue={defaults?.state} maxLength={2} required/></label>
      </div>
    </section>

    <section className="announce-pro-section">
      <div className="announce-pro-head"><span>04</span><div><h3>FOTOS E VÍDEOS</h3><p>Use até 15 arquivos. A primeira imagem será a capa do projeto.</p></div></div>
      <div className="announce-media-grid">
        {previews.map((x,i)=><div className={`announce-media-item ${i===0?'cover':''}`} key={i}>{x.file.type.startsWith('video/')?<video src={x.url} muted/>:<img src={x.url} alt="Prévia"/>}{i===0?<b>CAPA</b>:null}<button type="button" onClick={()=>setFiles(f=>f.filter((_,n)=>n!==i))}><X size={14}/></button></div>)}
        {files.length<15?<button type="button" className="announce-upload-card" onClick={()=>inputRef.current?.click()}><UploadCloud size={30}/><b>ADICIONAR MÍDIA</b><small>{files.length}/15</small></button>:null}
      </div>
      <input ref={inputRef} className="announce-hidden-input" type="file" accept="image/*,video/*" multiple onChange={e=>pick(e.target.files)}/>
    </section>

    <div className="announce-publish-panel">
      <div><CheckCircle2 size={21}/><span><b>MINHA GARAGEM</b><small>Seu carro ficará disponível para posts, perfil público e Diário do Projeto.</small></span></div>
      <button className="btn btn-red fs-hero-action" disabled={busy}>{busy?'SALVANDO...':'ADICIONAR À GARAGEM'}</button>
    </div>
    {msg?<div className={`form-message announce-pro-message ${msg.includes('adicionado')?'success':''}`}>{msg}</div>:null}
  </form>
}
