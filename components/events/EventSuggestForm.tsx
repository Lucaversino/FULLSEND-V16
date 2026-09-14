'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EVENT_CATEGORIES, slugifyEvent } from '@/lib/events'
import { UploadCloud, ShieldCheck } from 'lucide-react'

export default function EventSuggestForm(){
  const router=useRouter()
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')
  const [preview,setPreview]=useState('')
  const fileRef=useRef<HTMLInputElement|null>(null)

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    if(busy)return
    setBusy(true);setMsg('Enviando sugestão...')
    try{
      const form=e.currentTarget
      const fd=new FormData(form)
      const s=createClient()
      const {data:{user}}=await s.auth.getUser()
      if(!user){router.push('/login?next=/eventos/adicionar');return}
      let image_url=String(fd.get('image_url')||'').trim()||null
      const file=fd.get('image')
      if(file instanceof File&&file.size){
        if(file.size>10*1024*1024)throw new Error('A imagem deve ter no máximo 10 MB.')
        const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
        const path=`${user.id}/${crypto.randomUUID()}-${safe}`
        const {error}=await s.storage.from('event-images').upload(path,file,{upsert:false})
        if(error)throw new Error(error.message)
        const {data}=s.storage.from('event-images').getPublicUrl(path)
        image_url=data.publicUrl
      }
      const title=String(fd.get('title')||'').trim()
      const city=String(fd.get('city')||'').trim()
      const date=String(fd.get('event_date')||'')
      const slug=`${slugifyEvent(`${title}-${city}-${date.slice(0,4)}`)}-${Date.now().toString().slice(-6)}`
      const payload={
        title,
        slug,
        description:String(fd.get('description')||'').trim()||null,
        category:String(fd.get('category')||'Outros'),
        event_date:date,
        end_date:String(fd.get('end_date')||'')||null,
        event_time:String(fd.get('event_time')||'')||null,
        venue:String(fd.get('venue')||'').trim()||null,
        address:String(fd.get('address')||'').trim()||null,
        city,
        state:String(fd.get('state')||'').trim().toUpperCase().slice(0,2)||null,
        country:String(fd.get('country')||'BR').trim().toUpperCase()||'BR',
        latitude:fd.get('latitude')?Number(fd.get('latitude')):null,
        longitude:fd.get('longitude')?Number(fd.get('longitude')):null,
        image_url,
        ticket_url:String(fd.get('ticket_url')||'').trim()||null,
        source_url:String(fd.get('source_url')||'').trim()||null,
        source:'fullsend',
        status:'pending',
        featured:false,
        created_by:user.id,
      }
      if(!title||!date)throw new Error('Nome e data são obrigatórios.')
      const {error}=await s.from('events').insert(payload)
      if(error)throw new Error(error.message)
      setMsg('Evento enviado para aprovação do administrador.')
      setTimeout(()=>router.push('/eventos'),900)
    }catch(err){setMsg(err instanceof Error?err.message:'Não foi possível enviar o evento.')}
    finally{setBusy(false)}
  }

  return <form className="event-suggest-form" onSubmit={submit}>
    <div className="event-suggest-grid">
      <label className="wide">Nome do evento<input name="title" required maxLength={160}/></label>
      <label>Categoria<select name="category">{EVENT_CATEGORIES.filter(x=>x!=='Todos').map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Data<input name="event_date" type="date" required/></label>
      <label>Horário<input name="event_time" type="time"/></label>
      <label>Data final<input name="end_date" type="date"/></label>
      <label className="wide">Descrição<textarea name="description" rows={6}/></label>
      <label>Local<input name="venue" placeholder="Autódromo, praça, estacionamento..."/></label>
      <label>Endereço<input name="address"/></label>
      <label>Cidade<input name="city" required/></label>
      <label>Estado<input name="state" maxLength={2}/></label>
      <label>País<input name="country" defaultValue="BR"/></label>
      <label>Latitude<input name="latitude" type="number" step="any"/></label>
      <label>Longitude<input name="longitude" type="number" step="any"/></label>
      <label>Link de ingresso<input name="ticket_url" type="url"/></label>
      <label>Site oficial<input name="source_url" type="url"/></label>
      <label className="wide">URL de imagem (opcional)<input name="image_url" type="url"/></label>
      <label className="wide event-image-upload">
        <UploadCloud size={27}/>
        <b>ENVIAR IMAGEM</b>
        <span>JPG, PNG ou WEBP • até 10 MB</span>
        <input ref={fileRef} name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{
          const f=e.target.files?.[0]; if(f)setPreview(URL.createObjectURL(f))
        }}/>
        {preview?<img src={preview} alt="Prévia"/>:null}
      </label>
    </div>
    <div className="event-suggest-submit"><div><ShieldCheck size={18}/><span>O evento será revisado antes de aparecer publicamente.</span></div><button disabled={busy}>{busy?'ENVIANDO...':'ENVIAR PARA APROVAÇÃO'}</button></div>
    {msg?<div className="event-form-message">{msg}</div>:null}
  </form>
}
