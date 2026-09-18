'use client'
import { useState,useRef } from 'react'
import './composer-simple.css'
import { createClient } from '@/lib/supabase/client'
import { MIME,postSchema,request,type CommunityPost,type PostInput } from '@/lib/community/shared'
import VideoStudio from './VideoStudio'

type Media=PostInput['media'][number]&{url?:string}
export default function Composer({initial,vehicleId,onDone,onClose}:{initial?:CommunityPost;vehicleId?:string;onDone:()=>void;onClose:()=>void}){
 const [id]=useState(()=>initial?.id||crypto.randomUUID())
 const [content,setContent]=useState(initial?.content||''),[type,setType]=useState(initial?.post_type||'Post normal')
 const [vehicle,setVehicle]=useState(initial?.vehicle_id||vehicleId||''),[event,setEvent]=useState(initial?.event_id||'')
 const [city,setCity]=useState(initial?.city||''),[state,setState]=useState(initial?.state||''),[category,setCategory]=useState(initial?.category||'Geral')
 const [tags,setTags]=useState(initial?.tags.join(' ')||''),[media,setMedia]=useState<Media[]>(initial?.media||[])
 const [diary,setDiary]=useState(Boolean(initial?.project_date)),[title,setTitle]=useState(initial?.title||'')
 const [date,setDate]=useState(initial?.project_date||new Date().toLocaleDateString('sv-SE')),[parts,setParts]=useState(initial?.parts||'')
 const [power,setPower]=useState(initial?.power?.toString()||''),[cost,setCost]=useState(initial?.cost?.toString()||'')
 const [busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState('')
 const [videoQueue,setVideoQueue]=useState<File[]>([])
 const fileInput=useRef<HTMLInputElement>(null)
 const textInput=useRef<HTMLTextAreaElement>(null)
 const uploadLock=useRef(false)
 const submitLock=useRef(false)
 function emoji(value:string){const el=textInput.current;const start=el?.selectionStart??content.length;const end=el?.selectionEnd??start;const next=content.slice(0,start)+value+content.slice(end);if(next.length>5000)return;setContent(next);requestAnimationFrame(()=>{el?.focus();el?.setSelectionRange(start+value.length,start+value.length)})}
 async function upload(files:File[]){
  if(uploadLock.current||submitLock.current)return false
  if(!files.length)return false
  if(media.length+files.length>10){setError('Use até 10 arquivos por publicação.');return false}
  uploadLock.current=true;setUploading(true);setError('')
  try{
   for(const file of files){
    const limit=file.type.startsWith('video/')?200*1024*1024:20*1024*1024
    if(!(MIME as readonly string[]).includes(file.type)||file.size>limit)throw new Error('Envie imagens de até 20 MB ou vídeos MP4/WebM de até 200 MB.')
    const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer()),ascii=(a:number,b:number)=>String.fromCharCode(...bytes.slice(a,b))
    const valid=file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:file.type==='image/png'?bytes[0]===137&&ascii(1,4)==='PNG':file.type==='image/webp'?ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP':file.type==='video/mp4'?ascii(4,8)==='ftyp':bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163
    if(!valid)throw new Error('O conteúdo do arquivo não corresponde ao formato informado.')
    const signed=await request('/api/community/upload',{type:file.type,size:file.size})
    const s=createClient();const result=await s.storage.from('community-media').uploadToSignedUrl(signed.path,signed.token,file,{contentType:file.type})
    if(result.error)throw new Error('O upload falhou. Confira a conexão e tente novamente.')
    const preview=await s.storage.from('community-media').createSignedUrl(signed.path,3600)
    setMedia(m=>[...m,{path:signed.path,type:file.type as any,url:preview.data?.signedUrl}])
   }
   return true
  }catch(e){setError(e instanceof Error?e.message:'Falha no upload.');return false}finally{uploadLock.current=false;setUploading(false)}
 }
 async function choose(files:FileList|null){
  const selected=Array.from(files||[]);if(!selected.length)return
  if(media.length+videoQueue.length+selected.length>10){setError('Use até 10 arquivos por publicação.');return}
  const images=selected.filter(file=>file.type.startsWith('image/')),videos=selected.filter(file=>file.type.startsWith('video/'))
  const invalid=selected.find(file=>!images.includes(file)&&!videos.includes(file));if(invalid){setError('Escolha somente fotos ou vídeos.');return}
  if(images.length)await upload(images)
  if(videos.length)setVideoQueue(queue=>[...queue,...videos])
 }
 async function submit(e:React.FormEvent){e.preventDefault();if(uploadLock.current||submitLock.current)return;submitLock.current=true;setBusy(true);setError('');try{
  const extracted=Array.from(content.matchAll(/#([\p{L}\p{N}_]+)/gu)).map(m=>m[1])
  const payload=postSchema.safeParse({id,content,post_type:type,vehicle_id:vehicle||null,event_id:['Evento','Encontro'].includes(type)?event||null:null,category,city,state,tags:Array.from(new Set([...tags.split(/[\s,#]+/).filter(Boolean),...extracted].map(t=>t.toLowerCase()))),media:media.map(({path,type})=>({path,type})),title:diary?title:'',project_date:diary?date:null,parts:diary?parts:'',power:diary&&power!==''?Number(power.replace(',','.')):null,cost:diary&&cost!==''?Number(cost.replace(',','.')):null})
  if(!payload.success)throw new Error(payload.error.issues[0].message)
  await request('/api/community',initial?{post:payload.data}:{action:'post',post:payload.data},initial?'PATCH':'POST')
  onDone()
 }catch(e){setError(e instanceof Error?e.message:'Não foi possível publicar.')}finally{submitLock.current=false;setBusy(false)}}
 return <section className="cm-card cm-composer cm-composer-simple" aria-label={initial?'Editar publicação':'Criar publicação'}>
  <div className="cm-row"><h2>{initial?'Editar publicação':'Publicar'}</h2><button type="button" disabled={busy||uploading} onClick={onClose} aria-label="Fechar editor">✕</button></div>
  <form onSubmit={submit}>
   <label className="cm-simple-label">Sua publicação<textarea ref={textInput} required maxLength={5000} rows={5} disabled={busy} value={content} onChange={e=>setContent(e.target.value)} placeholder="O que está rolando? Mostre seu carro, conte uma novidade ou puxe uma conversa…"/></label>
   <div className="cm-simple-emojis" role="group" aria-label="Emojis automotivos">{[['🚗','Carro'],['🏎️','Carro de corrida'],['🏁','Bandeira quadriculada'],['🔧','Ferramenta'],['⚙️','Engrenagem'],['🔥','Fogo'],['💨','Velocidade'],['🤘','Rock']].map(([value,label])=><button key={value} type="button" disabled={busy} aria-label={`Inserir ${label}`} title={label} onClick={()=>emoji(value)}>{value}</button>)}</div>
   <input ref={fileInput} hidden aria-label="Selecionar fotos ou vídeos" type="file" accept={MIME.join(',')} multiple disabled={uploading||busy} onChange={e=>{choose(e.target.files);e.target.value=''}}/>
   {!!media.length&&<div className="cm-previews">{media.map((m,i)=><div key={m.path}>{m.type.startsWith('video/')?<video src={m.url} controls playsInline preload="metadata"/>:<img src={m.url} alt={`Anexo ${i+1}`}/>}<button type="button" disabled={busy||uploading} onClick={()=>setMedia(items=>items.filter(x=>x.path!==m.path))}>Remover {i+1}</button></div>)}</div>}
   {error&&<p className="cm-error" role="alert">{error}</p>}
   {uploading&&<p role="status" className="cm-muted">Enviando anexos… Aguarde para publicar.</p>}
   <div className="cm-simple-footer"><button type="button" disabled={busy||uploading||media.length+videoQueue.length>=10} onClick={()=>fileInput.current?.click()}>＋ Fotos / vídeos{media.length||videoQueue.length?` (${media.length+videoQueue.length}/10)`:''}</button><button className="cm-primary" disabled={busy||uploading||videoQueue.length>0||!content.trim()}>{busy?'Publicando…':initial?'Salvar':'Publicar'}</button></div>
   <small className="cm-simple-help">Todo vídeo abre o FULLSEND Video Studio antes de publicar · até 10 anexos · vídeos até 200 MB · sem Cloudinary</small>
  </form>
  {videoQueue[0]&&<VideoStudio file={videoQueue[0]} onCancel={()=>setVideoQueue(queue=>queue.slice(1))} onConfirm={async edited=>{if(await upload([edited]))setVideoQueue(queue=>queue.slice(1))}}/>}
 </section>
}
