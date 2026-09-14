'use client'
import { useEffect,useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { POST_TYPES,MIME,postSchema,request,type CommunityPost,type PostInput } from '@/lib/community/shared'

type Media=PostInput['media'][number]&{url?:string}
export default function Composer({initial,vehicleId,onDone,onClose}:{initial?:CommunityPost;vehicleId?:string;onDone:()=>void;onClose:()=>void}){
 const [id]=useState(()=>initial?.id||crypto.randomUUID())
 const [content,setContent]=useState(initial?.content||''),[type,setType]=useState(initial?.post_type||'Post normal')
 const [vehicle,setVehicle]=useState(initial?.vehicle_id||vehicleId||''),[event,setEvent]=useState(initial?.event_id||'')
 const [city,setCity]=useState(initial?.city||''),[state,setState]=useState(initial?.state||''),[category,setCategory]=useState(initial?.category||'Geral')
 const [tags,setTags]=useState(initial?.tags.join(' ')||''),[media,setMedia]=useState<Media[]>(initial?.media||[])
 const [diary,setDiary]=useState(Boolean(initial?.project_date||vehicleId)),[title,setTitle]=useState(initial?.title||'')
 const [date,setDate]=useState(initial?.project_date||new Date().toLocaleDateString('sv-SE')),[parts,setParts]=useState(initial?.parts||'')
 const [power,setPower]=useState(initial?.power?.toString()||''),[cost,setCost]=useState(initial?.cost?.toString()||'')
 const [busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState('')
 async function upload(files:FileList|null){
  if(!files?.length)return
  if(media.length+files.length>10){setError('Use até 10 arquivos por publicação.');return}
  setUploading(true);setError('')
  try{
   for(const file of Array.from(files)){
    if(!(MIME as readonly string[]).includes(file.type)||file.size>20*1024*1024)throw new Error('Envie JPG, PNG, WebP, MP4 ou WebM de até 20 MB por arquivo.')
    const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer()),ascii=(a:number,b:number)=>String.fromCharCode(...bytes.slice(a,b))
    const valid=file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:file.type==='image/png'?bytes[0]===137&&ascii(1,4)==='PNG':file.type==='image/webp'?ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP':file.type==='video/mp4'?ascii(4,8)==='ftyp':bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163
    if(!valid)throw new Error('O conteúdo do arquivo não corresponde ao formato informado.')
    const signed=await request('/api/community/upload',{type:file.type,size:file.size})
    const s=createClient();const result=await s.storage.from('community-media').uploadToSignedUrl(signed.path,signed.token,file,{contentType:file.type})
    if(result.error)throw new Error('O upload falhou. Confira a conexão e tente novamente.')
    const preview=await s.storage.from('community-media').createSignedUrl(signed.path,3600)
    setMedia(m=>[...m,{path:signed.path,type:file.type as any,url:preview.data?.signedUrl}])
   }
  }catch(e){setError(e instanceof Error?e.message:'Falha no upload.')}finally{setUploading(false)}
 }
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{
  const extracted=Array.from(content.matchAll(/#([\p{L}\p{N}_]+)/gu)).map(m=>m[1])
  const payload=postSchema.safeParse({id,content,post_type:type,vehicle_id:vehicle||null,event_id:['Evento','Encontro'].includes(type)?event||null:null,category,city,state,tags:Array.from(new Set([...tags.split(/[\s,#]+/).filter(Boolean),...extracted].map(t=>t.toLowerCase()))),media:media.map(({path,type})=>({path,type})),title:diary?title:'',project_date:diary?date:null,parts:diary?parts:'',power:diary&&power!==''?Number(power.replace(',','.')):null,cost:diary&&cost!==''?Number(cost.replace(',','.')):null})
  if(!payload.success)throw new Error(payload.error.issues[0].message)
  await request('/api/community',initial?{post:payload.data}:{action:'post',post:payload.data},initial?'PATCH':'POST')
  onDone()
 }catch(e){setError(e instanceof Error?e.message:'Não foi possível publicar.')}finally{setBusy(false)}}
 return <section className="cm-card cm-composer" aria-label={initial?'Editar publicação':'Criar publicação'}>
  <div className="cm-row"><h2>{initial?'Editar publicação':'O que está acontecendo na sua garagem?'}</h2><button type="button" disabled={busy||uploading} onClick={onClose} aria-label="Fechar editor">✕</button></div>
  <form onSubmit={submit}>
   <div className="cm-fields"><label>Tipo de publicação<select value={type} onChange={e=>setType(e.target.value as any)}>{POST_TYPES.map(t=><option key={t}>{t}</option>)}</select></label><label>Categoria<select value={category} onChange={e=>setCategory(e.target.value)}>{Array.from(new Set(['Geral','Turbo','Rebaixado','JDM','Antigos','Arrancada','TrackDay','Som automotivo','Euro','OffRoad',category])).map(c=><option key={c}>{c}</option>)}</select></label></div>
   <label>Texto<textarea required maxLength={5000} rows={5} value={content} onChange={e=>setContent(e.target.value)} placeholder="Mostre seu projeto, compartilhe uma conquista ou tire uma dúvida…"/></label>
   <small>{content.length}/5000</small>
   <Picker kind="vehicles" value={vehicle} onChange={setVehicle} label="Carro da Minha Garagem (opcional)" initialLabel={initial?.vehicle?.title}/>
   {['Evento','Encontro'].includes(type)&&<><Picker kind="events" value={event} onChange={setEvent} label="Evento da sua agenda" initialLabel={initial?.event?.title}/><p className="cm-muted">O evento usa a agenda existente e mantém sua aprovação. <Link href="/eventos/adicionar" target="_blank">Cadastrar evento em outra aba ↗</Link> Depois clique em atualizar a lista.</p></>}
   <div className="cm-fields"><label>Cidade (opcional)<input maxLength={100} value={city} onChange={e=>setCity(e.target.value)}/></label><label>UF (opcional)<input maxLength={2} value={state} onChange={e=>setState(e.target.value.toUpperCase().replace(/[^A-Z]/g,''))}/></label></div>
   <label>Hashtags<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Turbo Projeto Rebaixado" maxLength={615}/></label>
   <label className="cm-upload">{uploading?'Enviando arquivos…':'Adicionar fotos ou vídeos'}<input aria-label="Adicionar fotos ou vídeos" type="file" accept={MIME.join(',')} multiple disabled={uploading||busy} onChange={e=>{upload(e.target.files);e.target.value=''}}/><small>Até 10 arquivos. Máximo de 20 MB por arquivo.</small></label>
   <div className="cm-previews">{media.map((m,i)=><div key={m.path}>{m.type.startsWith('video/')?<video src={m.url} controls preload="metadata"/>:<img src={m.url} alt={`Anexo ${i+1}`}/>}<button type="button" disabled={busy||uploading} onClick={()=>setMedia(items=>items.filter(x=>x.path!==m.path))}>Remover anexo {i+1}</button></div>)}</div>
   <label className="cm-check"><input type="checkbox" checked={diary} onChange={e=>setDiary(e.target.checked)}/> Adicionar ao Diário do Projeto</label>
   {diary&&<div className="cm-diary-form"><p>Selecione o carro da garagem acima. Esta publicação também aparecerá na linha do tempo dele.</p><label>Título da atualização<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Data<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><label>Peças instaladas<textarea maxLength={1500} value={parts} onChange={e=>setParts(e.target.value)}/></label><div className="cm-fields"><label>Potência em cv (opcional)<input inputMode="decimal" value={power} onChange={e=>setPower(e.target.value)}/></label><label>Custo em R$ (opcional, público)<input inputMode="decimal" value={cost} onChange={e=>setCost(e.target.value)}/></label></div></div>}
   {error&&<p className="cm-error" role="alert">{error}</p>}
   <div className="cm-row"><button type="button" disabled={busy||uploading} onClick={onClose}>Cancelar</button><button className="cm-primary" disabled={busy||uploading}>{busy?'Salvando…':initial?'Salvar alterações':'Publicar'}</button></div>
  </form>
 </section>
}
function Picker({kind,value,onChange,label,initialLabel}:{kind:string;value:string;onChange:(s:string)=>void;label:string;initialLabel?:string}){
 const [items,setItems]=useState<any[]>([]),[q,setQ]=useState(''),[page,setPage]=useState(1),[more,setMore]=useState(false),[error,setError]=useState(''),[tick,setTick]=useState(0)
 useEffect(()=>{let active=true;setError('');request(`/api/community?mode=options&kind=${kind}&page=${page}&q=${encodeURIComponent(q)}`).then(d=>{if(active){setItems(old=>page===1?d.items:[...old,...d.items]);setMore(d.hasMore)}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[kind,page,q,tick])
 return <div className="cm-picker"><label>{label}<input aria-label={`Buscar ${label}`} placeholder="Buscar pelo nome…" value={q} onChange={e=>{setPage(1);setQ(e.target.value)}}/><select value={value} onChange={e=>onChange(e.target.value)}><option value="">Selecione</option>{value&&!items.some(x=>x.id===value)&&<option value={value}>{initialLabel||'Carro/projeto selecionado'}</option>}{items.map(x=><option key={x.id} value={x.id}>{x.title}{x.status==='pending'?' — aguardando aprovação':''}</option>)}</select></label><div className="cm-row"><button type="button" onClick={()=>{setPage(1);setTick(t=>t+1)}}>Atualizar lista</button>{more&&<button type="button" onClick={()=>setPage(p=>p+1)}>Carregar mais opções</button>}</div>{error&&<p role="alert" className="cm-error">{error}</p>}</div>
}
