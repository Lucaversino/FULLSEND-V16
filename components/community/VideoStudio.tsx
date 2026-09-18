'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, Film, Music2, Pause, Play, Scissors, Trash2, Upload, Volume2, X, Zap } from 'lucide-react'
import { request } from '@/lib/community/shared'
import './video-studio.css'

type MusicTrack={id:string;file:File;url:string;start:number;volume:number;duration:number}
type Ratio='original'|'vertical'|'square'
type CropMode='fill'|'fit'
type Quality='720'|'1080'
type CloudinaryUpload={publicId:string;secureUrl:string}
type ProcessedVideo={path:string;type:'video/mp4';url:string}
type CaptionState='idle'|'working'|'ready'|'skipped'

const MAX_VIDEO_BYTES=100*1024*1024
const MAX_AUDIO_BYTES=20*1024*1024

const fmt=(value:number)=>{
 const safe=Math.max(0,Number.isFinite(value)?value:0)
 const minutes=Math.floor(safe/60)
 return `${minutes}:${Math.floor(safe%60).toString().padStart(2,'0')}.${Math.floor((safe%1)*10)}`
}
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))

async function uploadCloudinary(file:File,kind:'video'|'audio',onProgress:(value:number)=>void):Promise<CloudinaryUpload>{
 const signed=await request('/api/community/video/sign',{kind}) as {cloudName:string;apiKey:string;timestamp:number;signature:string;folder:string}
 return new Promise((resolve,reject)=>{
  const xhr=new XMLHttpRequest()
  const form=new FormData()
  form.append('file',file)
  form.append('api_key',signed.apiKey)
  form.append('timestamp',String(signed.timestamp))
  form.append('signature',signed.signature)
  form.append('folder',signed.folder)
  xhr.open('POST',`https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/video/upload`)
  xhr.responseType='json'
  xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress(Math.max(0,Math.min(1,event.loaded/event.total)))}
  xhr.onerror=()=>reject(new Error('A conexão caiu durante o envio para o processador de vídeo.'))
  xhr.onload=()=>{
   const data=xhr.response||{}
   if(xhr.status<200||xhr.status>=300){reject(new Error(data?.error?.message||'O processador de vídeo recusou o arquivo.'));return}
   if(!data.public_id||!data.secure_url){reject(new Error('O processador não retornou os dados do vídeo.'));return}
   onProgress(1)
   resolve({publicId:String(data.public_id),secureUrl:String(data.secure_url)})
  }
  xhr.send(form)
 })
}

async function probeRemoteVideo(url:string){
 for(let attempt=0;attempt<10;attempt++){
  const ok=await new Promise<boolean>(resolve=>{
   const video=document.createElement('video')
   let done=false
   const finish=(value:boolean)=>{
    if(done)return
    done=true
    window.clearTimeout(timer)
    video.onloadedmetadata=null
    video.onerror=null
    video.removeAttribute('src')
    try{video.load()}catch{}
    resolve(value)
   }
   const timer=window.setTimeout(()=>finish(false),8000)
   video.preload='metadata'
   video.playsInline=true
   video.onloadedmetadata=()=>finish(true)
   video.onerror=()=>finish(false)
   video.src=`${url}${url.includes('?')?'&':'?'}fsprobe=${Date.now()}-${attempt}`
   video.load()
  })
  if(ok)return
  await sleep(1800+attempt*350)
 }
 throw new Error('O vídeo foi enviado, mas o processamento ainda não terminou. Tente confirmar novamente em alguns instantes.')
}

export default function VideoStudio({file,onCancel,onConfirm}:{file:File;onCancel:()=>void;onConfirm:(media:ProcessedVideo)=>void}){
 const sourceUrl=useMemo(()=>URL.createObjectURL(file),[file])
 const videoRef=useRef<HTMLVideoElement>(null)
 const musicInput=useRef<HTMLInputElement>(null)
 const audioRefs=useRef(new Map<string,HTMLAudioElement>())
 const tracksRef=useRef<MusicTrack[]>([])
 const [duration,setDuration]=useState(0),[current,setCurrent]=useState(0),[start,setStart]=useState(0),[end,setEnd]=useState(0)
 const [playing,setPlaying]=useState(false),[speed,setSpeed]=useState<.5|1|1.5|2>(1),[ratio,setRatio]=useState<Ratio>('vertical')
 const [cropMode,setCropMode]=useState<CropMode>('fill'),[quality,setQuality]=useState<Quality>('1080'),[originalVolume,setOriginalVolume]=useState(1)
 const [tracks,setTracks]=useState<MusicTrack[]>([]),[exporting,setExporting]=useState(false),[progress,setProgress]=useState(0),[stage,setStage]=useState('')
 const [captionsEnabled,setCaptionsEnabled]=useState(true),[captionState,setCaptionState]=useState<CaptionState>('idle'),[captionMessage,setCaptionMessage]=useState('Detecta a fala e sincroniza automaticamente.')
 const [error,setError]=useState('')

 useEffect(()=>{tracksRef.current=tracks},[tracks])
 useEffect(()=>()=>{URL.revokeObjectURL(sourceUrl);tracksRef.current.forEach(track=>URL.revokeObjectURL(track.url))},[sourceUrl])
 useEffect(()=>{
  const video=videoRef.current
  if(video){video.playbackRate=speed;video.volume=originalVolume}
  audioRefs.current.forEach(audio=>audio.playbackRate=speed)
 },[speed,originalVolume])

 function syncMusic(time:number,shouldPlay=playing){
  tracks.forEach(track=>{
   const audio=audioRefs.current.get(track.id)
   if(!audio)return
   const local=time-track.start
   audio.volume=track.volume
   audio.playbackRate=speed
   if(local>=0&&local<track.duration){
    if(Math.abs(audio.currentTime-local)>.45)audio.currentTime=local
    if(shouldPlay)audio.play().catch(()=>{})
   }else{
    audio.pause()
    if(audio.currentTime)audio.currentTime=0
   }
  })
 }

 function seek(value:number){
  const next=Math.min(end||duration,Math.max(start,value))
  setCurrent(next)
  if(videoRef.current)videoRef.current.currentTime=next
  syncMusic(next,false)
 }

 async function toggle(){
  const video=videoRef.current
  if(!video)return
  if(video.paused){
   if(video.currentTime<start||video.currentTime>=end)video.currentTime=start
   setPlaying(true)
   syncMusic(video.currentTime,true)
   await video.play().catch(()=>setError('Toque novamente para iniciar a prévia.'))
  }else video.pause()
 }

 function addMusic(files:FileList|null){
  const picked=Array.from(files||[]).slice(0,Math.max(0,4-tracks.length))
  if(!picked.length)return
  setError('')
  for(const pickedFile of picked){
   if(!pickedFile.type.startsWith('audio/')){setError('Escolha um arquivo de áudio válido.');continue}
   if(pickedFile.size>MAX_AUDIO_BYTES){setError('Cada música pode ter no máximo 20 MB.');continue}
   const url=URL.createObjectURL(pickedFile),audio=new Audio(url)
   audio.preload='metadata'
   audio.onloadedmetadata=()=>{
    setTracks(items=>{
     if(items.length>=4){URL.revokeObjectURL(url);return items}
     return [...items,{id:crypto.randomUUID(),file:pickedFile,url,start:current,volume:.85,duration:Number.isFinite(audio.duration)?audio.duration:0}]
    })
   }
   audio.onerror=()=>{URL.revokeObjectURL(url);setError(`Não foi possível abrir ${pickedFile.name}.`)}
  }
 }

 function removeTrack(id:string){
  setTracks(items=>{
   const found=items.find(track=>track.id===id)
   if(found)URL.revokeObjectURL(found.url)
   return items.filter(track=>track.id!==id)
  })
 }
 function updateTrack(id:string,patch:Partial<MusicTrack>){setTracks(items=>items.map(track=>track.id===id?{...track,...patch}:track))}

 function cutStartHere(){
  if(current>=end-.2)return
  setStart(current)
  setError('')
 }
 function cutEndHere(){
  if(current<=start+.2)return
  setEnd(current)
  setError('')
 }

 async function makeCaptions(publicId:string){
  if(!captionsEnabled)return false
  setCaptionState('working')
  setCaptionMessage('Gerando legenda automática… isso pode levar alguns segundos.')
  try{
   await request('/api/community/video/transcript',{action:'start',publicId})
   for(let attempt=0;attempt<45;attempt++){
    const status=await request('/api/community/video/transcript',{action:'status',publicId}) as {ready:boolean}
    if(status.ready){
     setCaptionState('ready')
     setCaptionMessage('Legendas automáticas prontas e sincronizadas.')
     return true
    }
    await sleep(2000)
   }
   setCaptionState('skipped')
   setCaptionMessage('A legenda ainda está processando. O vídeo continuará sem bloquear sua publicação.')
   return false
  }catch(cause){
   setCaptionState('skipped')
   setCaptionMessage(cause instanceof Error?cause.message:'Legendas automáticas indisponíveis agora.')
   return false
  }
 }

 async function renderCloudinary(useOriginal=false){
  if(exporting||!duration)return
  if(file.size>MAX_VIDEO_BYTES){setError('O FULLSEND Studio aceita vídeos de até 100 MB para manter a edição estável.');return}
  setExporting(true)
  setError('')
  setProgress(2)
  try{
   const editStart=useOriginal?0:start
   const editEnd=useOriginal?duration:end
   const editRatio:Ratio=useOriginal?'original':ratio
   const editCrop:CropMode=useOriginal?'fit':cropMode
   const editSpeed:.5|1|1.5|2=useOriginal?1:speed
   const editVolume=useOriginal?1:originalVolume
   const editTracks=useOriginal?[]:tracks

   setStage('ENVIANDO VÍDEO')
   const source=await uploadCloudinary(file,'video',value=>setProgress(3+value*38))

   let captionsReady=false
   if(!useOriginal&&captionsEnabled){
    setStage('GERANDO LEGENDAS AUTOMÁTICAS')
    setProgress(44)
    captionsReady=await makeCaptions(source.publicId)
    setProgress(54)
   }else if(!captionsEnabled){
    setCaptionState('idle')
    setCaptionMessage('Legendas automáticas desativadas.')
   }

   const uploadedTracks:{publicId:string;start:number;volume:number}[]=[]
   if(editTracks.length){
    for(let index=0;index<editTracks.length;index++){
     const track=editTracks[index]
     setStage(`ENVIANDO MÚSICA ${index+1} DE ${editTracks.length}`)
     const base=55+(index/editTracks.length)*20
     const span=20/editTracks.length
     const uploaded=await uploadCloudinary(track.file,'audio',value=>setProgress(base+value*span))
     uploadedTracks.push({publicId:uploaded.publicId,start:track.start,volume:track.volume})
    }
   }else setProgress(75)

   setStage('MONTANDO MP4 / H.264')
   setProgress(80)
   const output=await request('/api/community/video/render',{
    publicId:source.publicId,
    start:editStart,
    end:editEnd,
    ratio:editRatio,
    cropMode:editCrop,
    quality,
    speed:editSpeed,
    originalVolume:editVolume,
    captions:captionsReady,
    tracks:uploadedTracks
   }) as ProcessedVideo
   setProgress(89)
   setStage('FINALIZANDO VÍDEO')
   await probeRemoteVideo(output.url)
   setProgress(100)
   setStage('PRONTO PARA PUBLICAR')
   onConfirm(output)
  }catch(cause){
   setError(cause instanceof Error?cause.message:'Não foi possível processar este vídeo.')
  }finally{
   setExporting(false)
  }
 }

 const trimmed=Math.max(0,end-start)
 const captionLabel=captionState==='ready'?'PRONTAS':captionState==='working'?'GERANDO…':captionState==='skipped'?'INDISPONÍVEL':'AUTO'

 return <div className="fs-studio-backdrop" role="dialog" aria-modal="true" aria-label="Editor de vídeo FULLSEND Studio">
  <section className="fs-studio">
   <header className="fs-studio-head">
    <div><span>FULLSEND VIDEO STUDIO</span><h2>EDITOR DO MURAL</h2><p>Todo vídeo passa por aqui antes de publicar na Comunidade.</p></div>
    <div className="fs-head-actions"><b>{file.size>0?`${(file.size/1024/1024).toFixed(1)} MB`:''}</b><button type="button" onClick={onCancel} disabled={exporting} aria-label="Fechar"><X/></button></div>
   </header>

   <main className="fs-studio-workspace">
    <aside className="fs-studio-tools">
     <span className="fs-section-kicker">FERRAMENTAS</span>
     <h3><Scissors size={16}/> CORTE</h3>
     <div className="fs-two-grid"><button type="button" onClick={cutStartHere} disabled={current>=end-.2}>INÍCIO AQUI</button><button type="button" onClick={cutEndHere} disabled={current<=start+.2}>FIM AQUI</button></div>
     <small className="fs-tool-note">Ideal para clipes longos: escolha o trecho sem renderizar o vídeo no celular.</small>

     <h3><Film size={16}/> FORMATO</h3>
     {([['vertical','9:16 Vertical'],['square','1:1 Quadrado'],['original','Original']] as [Ratio,string][]).map(([value,label])=><button type="button" key={value} className={ratio===value?'active':''} onClick={()=>setRatio(value)}>{label}</button>)}

     {ratio!=='original'&&<><h3>ENQUADRAMENTO</h3><div className="fs-two-grid"><button type="button" className={cropMode==='fill'?'active':''} onClick={()=>setCropMode('fill')}>PREENCHER</button><button type="button" className={cropMode==='fit'?'active':''} onClick={()=>setCropMode('fit')}>SEM CORTAR</button></div></>}

     <h3><Zap size={16}/> QUALIDADE</h3>
     <div className="fs-two-grid"><button type="button" className={quality==='1080'?'active':''} onClick={()=>setQuality('1080')}>1080P</button><button type="button" className={quality==='720'?'active':''} onClick={()=>setQuality('720')}>720P</button></div>

     <h3>VELOCIDADE</h3>
     <div className="fs-speed-grid">{([.5,1,1.5,2] as const).map(value=><button type="button" key={value} className={speed===value?'active':''} onClick={()=>setSpeed(value)}>{value}x</button>)}</div>
    </aside>

    <div className="fs-studio-preview">
     <div className="fs-preview-badges"><span>VÍDEO · {fmt(duration)}</span><span className={captionState==='ready'?'is-ready':''}>CC {captionLabel}</span></div>
     <div className={`fs-video-frame ratio-${ratio} crop-${cropMode}`}><video ref={videoRef} src={sourceUrl} playsInline preload="metadata" onLoadedMetadata={e=>{const value=e.currentTarget.duration||0;setDuration(value);setEnd(value);setCurrent(0);e.currentTarget.volume=originalVolume}} onTimeUpdate={e=>{const time=e.currentTarget.currentTime;setCurrent(time);syncMusic(time,true);if(end&&time>=end){e.currentTarget.pause();seek(start)}}} onPlay={()=>setPlaying(true)} onPause={()=>{setPlaying(false);audioRefs.current.forEach(audio=>audio.pause())}}/></div>
     <div className="fs-preview-controls"><button type="button" onClick={toggle} aria-label={playing?'Pausar':'Reproduzir'}>{playing?<Pause/>:<Play/>}</button><span>{fmt(current)} / {fmt(duration)}</span><input aria-label="Posição do vídeo" type="range" min={start} max={end||1} step=".05" value={Math.min(Math.max(current,start),end||0)} onChange={e=>seek(Number(e.target.value))}/></div>
     <div className="fs-cloud-badge">PRÉVIA LEVE NO APARELHO · PROCESSAMENTO FINAL NA NUVEM</div>
    </div>

    <aside className="fs-studio-side">
     <section className="fs-side-card fs-caption-card">
      <div className="fs-side-title"><div><b>CC</b><span>LEGENDAS AUTOMÁTICAS</span></div><button type="button" className={captionsEnabled?'active':''} onClick={()=>{setCaptionsEnabled(v=>!v);setCaptionState('idle');setCaptionMessage(!captionsEnabled?'Detecta a fala e sincroniza automaticamente.':'Legendas automáticas desativadas.')}}>{captionsEnabled?'ATIVADAS':'DESATIVADAS'}</button></div>
      <p>{captionMessage}</p>
      <small>As legendas são geradas na nuvem e podem ser incorporadas ao MP4 final. Se o serviço de transcrição estiver indisponível, a edição continua normalmente.</small>
     </section>

     <section className="fs-side-card">
      <h3><Music2 size={17}/> MÚSICAS</h3>
      <p>Adicione até 4 faixas. Cada música entra na posição atual da agulha.</p>
      <input ref={musicInput} hidden type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg" multiple onChange={e=>{addMusic(e.target.files);e.target.value=''}}/>
      <button type="button" className="fs-add-music" onClick={()=>musicInput.current?.click()} disabled={tracks.length>=4||exporting}><Upload size={16}/> ADICIONAR MÚSICA</button>
      <strong>{tracks.length}/4 faixas · até 20 MB cada</strong>
     </section>

     <section className="fs-side-card">
      <h3><Volume2 size={16}/> ÁUDIO ORIGINAL</h3>
      <label className="fs-master-volume"><input type="range" min="0" max="1" step=".05" value={originalVolume} onChange={e=>setOriginalVolume(Number(e.target.value))}/><b>{Math.round(originalVolume*100)}%</b></label>
      <div className="fs-source-info"><b>{file.name}</b><small>Saída MP4 · H.264 · {quality==='1080'?'Full HD':'HD'}</small></div>
     </section>
    </aside>
   </main>

   <section className="fs-timeline">
    <div className="fs-timeline-title"><div><Scissors size={18}/><span>TIMELINE</span><small>Corte de vídeo grande sem processar tudo no navegador</small></div><b>{fmt(trimmed)}</b></div>
    <div className="fs-trim-controls">
     <label>INÍCIO <input type="range" min="0" max={Math.max(0,end-.2)} step=".1" value={start} onChange={e=>{const value=Number(e.target.value);setStart(value);seek(value)}}/><b>{fmt(start)}</b></label>
     <label>FIM <input type="range" min={Math.min(duration,start+.2)} max={duration||1} step=".1" value={end} onChange={e=>setEnd(Number(e.target.value))}/><b>{fmt(end)}</b></label>
    </div>
    <div className="fs-tracks">
     <div className="fs-track"><div className="fs-track-label"><Film size={15}/><span>VÍDEO</span></div><div className="fs-track-lane"><div className="fs-video-clip" style={{left:`${duration?start/duration*100:0}%`,width:`${duration?trimmed/duration*100:100}%`}}><span>{file.name}</span></div><div className="fs-playhead" style={{left:`${duration?current/duration*100:0}%`}}/></div></div>
     {tracks.map((track,index)=><div className="fs-track" key={track.id}><div className="fs-track-label"><Music2 size={15}/><span>ÁUDIO {index+1}</span></div><div className="fs-track-lane"><audio ref={node=>{if(node)audioRefs.current.set(track.id,node);else audioRefs.current.delete(track.id)}} src={track.url} preload="metadata"/><div className="fs-audio-clip" style={{left:`${duration?track.start/duration*100:0}%`,width:`${duration?Math.min(track.duration,Math.max(0,duration-track.start))/duration*100:20}%`}}><span>{track.file.name}</span></div></div><div className="fs-track-actions"><label title="Início da música">↦ <input type="number" min="0" max={duration} step=".1" value={track.start} onChange={e=>updateTrack(track.id,{start:Math.max(0,Math.min(duration,Number(e.target.value)))})}/></label><label title="Volume"><Volume2 size={13}/><input type="range" min="0" max="1" step=".05" value={track.volume} onChange={e=>updateTrack(track.id,{volume:Number(e.target.value)})}/></label><button type="button" onClick={()=>removeTrack(track.id)} aria-label={`Remover ${track.file.name}`}><Trash2 size={14}/></button></div></div>)}
    </div>
   </section>

   {error&&<div className="fs-studio-error" role="alert">{error}</div>}
   {exporting&&<div className="fs-render-progress" role="status"><div style={{width:`${progress}%`}}/><span>{stage} · {Math.round(progress)}%</span></div>}

   <footer className="fs-studio-footer">
    <button type="button" onClick={onCancel} disabled={exporting}><ChevronLeft size={17}/> CANCELAR</button>
    <div><button type="button" className="fs-use-original" onClick={()=>renderCloudinary(true)} disabled={exporting||!duration}>USAR ORIGINAL</button><button type="button" className="fs-render" onClick={()=>renderCloudinary(false)} disabled={exporting||!duration||trimmed<.2}><Check size={18}/>{exporting?'PROCESSANDO…':'GERAR VÍDEO'}</button></div>
   </footer>
  </section>
 </div>
}
