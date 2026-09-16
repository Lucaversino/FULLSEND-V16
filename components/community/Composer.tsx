'use client'
import { useEffect,useRef,useState } from 'react'
import './composer-simple.css'
import { createClient } from '@/lib/supabase/client'
import { MIME,postSchema,request,type CommunityPost,type PostInput } from '@/lib/community/shared'
import dynamic from 'next/dynamic'
import type { EditedVideoResult } from './VideoEditor'

const VideoEditor=dynamic(()=>import('./VideoEditor'),{ssr:false})
type Media=PostInput['media'][number]&{url?:string;posterUrl?:string}
const MAX=250*1024*1024
const INPUT_MIME=[...MIME,'video/quicktime'] as const

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
 const [videoQueue,setVideoQueue]=useState<File[]>([]),[activeVideo,setActiveVideo]=useState<File|null>(null)
 const [stage,setStage]=useState(''),[uploadProgress,setUploadProgress]=useState(0)
 const fileInput=useRef<HTMLInputElement>(null),textInput=useRef<HTMLTextAreaElement>(null),uploadLock=useRef(false),submitLock=useRef(false)
 useEffect(()=>{if(!activeVideo&&videoQueue.length){setActiveVideo(videoQueue[0]);setVideoQueue(q=>q.slice(1))}},[activeVideo,videoQueue])
 function emoji(value:string){const el=textInput.current;const start=el?.selectionStart??content.length;const end=el?.selectionEnd??start;const next=content.slice(0,start)+value+content.slice(end);if(next.length>5000)return;setContent(next);requestAnimationFrame(()=>{el?.focus();el?.setSelectionRange(start+value.length,start+value.length)})}
 function magicValid(file:File,bytes:Uint8Array){const ascii=(a:number,b:number)=>String.fromCharCode(...bytes.slice(a,b));return file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:file.type==='image/png'?bytes[0]===137&&ascii(1,4)==='PNG':file.type==='image/webp'?ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP':(file.type==='video/mp4'||file.type==='video/quicktime')?ascii(4,8)==='ftyp':bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163}
 async function validate(file:File){if(!(INPUT_MIME as readonly string[]).includes(file.type)||file.size>MAX)throw new Error('Envie JPG, PNG, WebP, MP4, MOV ou WebM de até 250 MB por arquivo.');const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());if(!magicValid(file,bytes))throw new Error('O conteúdo do arquivo não corresponde ao formato informado.')}
 async function signedUpload(file:File,purpose:'image'|'video'|'thumbnail',meta?:{duration?:number;width?:number;height?:number;aspectRatio?:string}){
  setUploading(true);setStage(purpose==='video'?'Enviando vídeo…':purpose==='thumbnail'?'Enviando capa…':'Enviando imagem…');setUploadProgress(10)
  const signed=await request('/api/community/upload',{type:file.type,size:file.size,purpose,postId:id,duration:meta?.duration,width:meta?.width,height:meta?.height,aspectRatio:meta?.aspectRatio})
  const s=createClient();setUploadProgress(45)
  const result=await s.storage.from('community-media').uploadToSignedUrl(signed.path,signed.token,file,{contentType:file.type})
  if(result.error)throw new Error('O upload falhou. Confira a conexão e tente novamente.')
  setUploadProgress(90);return {path:signed.path}
 }
 async function uploadImages(files:File[]){
  if(!files.length)return;uploadLock.current=true;setUploading(true);setError('')
  try{for(const file of files){await validate(file);const {path}=await signedUpload(file,'image');const s=createClient();const preview=await s.storage.from('community-media').createSignedUrl(path,3600);setMedia(m=>[...m,{path,type:file.type as any,url:preview.data?.signedUrl}])}}
  catch(e){setError(e instanceof Error?e.message:'Falha no upload.')}
  finally{uploadLock.current=false;setUploading(false);setStage('');setUploadProgress(0)}
 }
 async function choose(files:FileList|null){
  if(uploadLock.current||submitLock.current||!files?.length)return
  if(media.length+videoQueue.length+(activeVideo?1:0)+files.length>10){setError('Use até 10 arquivos por publicação.');return}
  const list=Array.from(files);setError('')
  try{for(const f of list)await validate(f)}catch(e){setError(e instanceof Error?e.message:'Arquivo inválido.');return}
  const images=list.filter(f=>f.type.startsWith('image/')),videos=list.filter(f=>f.type.startsWith('video/'))
  if(images.length)void uploadImages(images)
  if(videos.length)setVideoQueue(q=>[...q,...videos])
 }
 async function videoDone(result:EditedVideoResult){
  try{
   uploadLock.current=true;setUploading(true);setError('');setStage('Enviando vídeo otimizado…');setUploadProgress(5)
   const video=await signedUpload(result.video,'video',result);setUploadProgress(55)
   const thumb=await signedUpload(result.thumbnail,'thumbnail',result);setUploadProgress(85)
   const s=createClient(),[videoUrl,posterUrl]=await Promise.all([s.storage.from('community-media').createSignedUrl(video.path,3600),s.storage.from('community-media').createSignedUrl(thumb.path,3600)])
   setMedia(m=>[...m,{path:video.path,type:'video/mp4',posterPath:thumb.path,duration:result.duration,width:result.width,height:result.height,aspectRatio:result.aspectRatio,url:videoUrl.data?.signedUrl,posterUrl:posterUrl.data?.signedUrl}])
   setUploadProgress(100);setStage('Vídeo pronto para publicar');setActiveVideo(null)
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível enviar o vídeo editado. Tente novamente.')}
  finally{uploadLock.current=false;setUploading(false);setTimeout(()=>{setStage('');setUploadProgress(0)},600)}
 }
 async function removeMedia(item:Media){
  setMedia(items=>items.filter(x=>x.path!==item.path))
  try{const paths=[item.path,item.posterPath].filter(Boolean) as string[];if(paths.length)await createClient().storage.from('community-media').remove(paths)}catch{}
 }
 async function submit(e:React.FormEvent){e.preventDefault();if(uploadLock.current||submitLock.current||activeVideo||videoQueue.length)return;submitLock.current=true;setBusy(true);setError('');try{
  setStage('Finalizando publicação…')
  const extracted=Array.from(content.matchAll(/#([\p{L}\p{N}_]+)/gu)).map(m=>m[1])
  const payload=postSchema.safeParse({id,content,post_type:type,vehicle_id:vehicle||null,event_id:['Evento','Encontro'].includes(type)?event||null:null,category,city,state,tags:Array.from(new Set([...tags.split(/[\s,#]+/).filter(Boolean),...extracted].map(t=>t.toLowerCase()))),media:media.map(({path,type,posterPath,duration,width,height,aspectRatio})=>({path,type,posterPath,duration,width,height,aspectRatio})),title:diary?title:'',project_date:diary?date:null,parts:diary?parts:'',power:diary&&power!==''?Number(power.replace(',','.')):null,cost:diary&&cost!==''?Number(cost.replace(',','.')):null})
  if(!payload.success)throw new Error(payload.error.issues[0].message)
  await request('/api/community',initial?{post:payload.data}:{action:'post',post:payload.data},initial?'PATCH':'POST');onDone()
 }catch(e){setError(e instanceof Error?e.message:'Não foi possível publicar.')}finally{submitLock.current=false;setBusy(false);setStage('')}}
 return <>
 {activeVideo&&<VideoEditor file={activeVideo} onCancel={()=>setActiveVideo(null)} onComplete={videoDone}/>} 
 <section className="cm-card cm-composer cm-composer-simple" aria-label={initial?'Editar publicação':'Criar publicação'}>
  <div className="cm-row"><h2>{initial?'Editar publicação':'Publicar'}</h2><button type="button" disabled={busy||uploading||!!activeVideo} onClick={onClose} aria-label="Fechar editor">✕</button></div>
  <form onSubmit={submit}>
   <label className="cm-simple-label">Sua publicação<textarea ref={textInput} required maxLength={5000} rows={5} disabled={busy} value={content} onChange={e=>setContent(e.target.value)} placeholder="O que está rolando? Mostre seu carro, conte uma novidade ou puxe uma conversa…"/></label>
   <div className="cm-simple-emojis" role="group" aria-label="Emojis automotivos">{[['🚗','Carro'],['🏎️','Carro de corrida'],['🏁','Bandeira quadriculada'],['🔧','Ferramenta'],['⚙️','Engrenagem'],['🔥','Fogo'],['💨','Velocidade'],['🤘','Rock']].map(([value,label])=><button key={value} type="button" disabled={busy} aria-label={`Inserir ${label}`} title={label} onClick={()=>emoji(value)}>{value}</button>)}</div>
   <input ref={fileInput} hidden aria-label="Selecionar fotos ou vídeos" type="file" accept={INPUT_MIME.join(',')} multiple disabled={uploading||busy||!!activeVideo} onChange={e=>{choose(e.target.files);e.target.value=''}}/>
   {!!media.length&&<div className="cm-previews">{media.map((m,i)=><div key={m.path}>{m.type.startsWith('video/')?<video src={m.url} poster={m.posterUrl} controls playsInline preload="metadata"/>:<img src={m.url} alt={`Anexo ${i+1}`}/>}<button type="button" disabled={busy||uploading} onClick={()=>void removeMedia(m)}>Remover {i+1}</button>{m.type.startsWith('video/')&&<small>9:16 · {m.duration?.toFixed?.(1)||'?'}s · otimizado</small>}</div>)}</div>}
   {videoQueue.length>0&&<p className="cm-muted">{videoQueue.length} vídeo(s) aguardando edição.</p>}
   {error&&<p className="cm-error" role="alert">{error}</p>}
   {(uploading||stage)&&<div className="cm-upload-progress" role="status"><span>{stage||'Preparando…'}</span>{uploadProgress>0&&<progress max="100" value={uploadProgress}/>}</div>}
   <div className="cm-simple-footer"><button type="button" disabled={busy||uploading||!!activeVideo||media.length+videoQueue.length>=10} onClick={()=>fileInput.current?.click()}>＋ Fotos / vídeos{media.length||videoQueue.length?` (${media.length+videoQueue.length}/10)`:''}</button><button className="cm-primary" disabled={busy||uploading||!!activeVideo||videoQueue.length>0||!content.trim()}>{busy?'Publicando…':initial?'Salvar':'Publicar'}</button></div>
   <small className="cm-simple-help">Até 10 fotos ou vídeos · 250 MB por arquivo · vídeos passam pelo FULLSEND Studio antes do upload</small>
  </form>
 </section></>
}
