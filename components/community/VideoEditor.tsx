'use client'

import { useEffect,useMemo,useRef,useState } from 'react'
import { Check,ChevronLeft,Film,Move,RotateCw,Scissors,Type,Volume2,VolumeX,Wand2,X,ZoomIn } from 'lucide-react'
import './video-editor.css'

type FitMode='cover'|'contain'
type FilterName='Original'|'Contraste'|'Cinema'|'P&B'|'Quente'|'Frio'
export type EditedVideoResult={
 video:File
 thumbnail:File
 duration:number
 width:number
 height:number
 aspectRatio:string
}

type Props={
 file:File
 onCancel:()=>void
 onComplete:(result:EditedVideoResult)=>Promise<void>|void
}

const FILTERS:FilterName[]=['Original','Contraste','Cinema','P&B','Quente','Frio']
const SPEEDS=[0.5,1,1.5,2] as const
const MAX_BROWSER_BYTES=250*1024*1024
const CORE='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
const PKG='https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/esm/index.js'
const UTIL='https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.2/dist/esm/index.js'

function clamp(n:number,min:number,max:number){return Math.min(max,Math.max(min,n))}
function cssFilter(name:FilterName){
 if(name==='Contraste')return 'contrast(1.15) saturate(1.05)'
 if(name==='Cinema')return 'contrast(1.12) saturate(.92) brightness(.97)'
 if(name==='P&B')return 'grayscale(1) contrast(1.05)'
 if(name==='Quente')return 'sepia(.18) saturate(1.08)'
 if(name==='Frio')return 'saturate(.95) hue-rotate(8deg)'
 return 'none'
}
function ffFilter(name:FilterName){
 if(name==='Contraste')return 'eq=contrast=1.15:saturation=1.05'
 if(name==='Cinema')return 'eq=contrast=1.12:saturation=.92:brightness=-.03'
 if(name==='P&B')return 'hue=s=0'
 if(name==='Quente')return 'colorbalance=rs=.08:bs=-.05'
 if(name==='Frio')return 'colorbalance=bs=.08:rs=-.04'
 return ''
}
async function getVideoMeta(file:File){
 return new Promise<{duration:number;width:number;height:number}>((resolve,reject)=>{
  const v=document.createElement('video'),url=URL.createObjectURL(file)
  v.preload='metadata';v.muted=true;v.playsInline=true
  v.onloadedmetadata=()=>{const data={duration:Number.isFinite(v.duration)?v.duration:0,width:v.videoWidth,height:v.videoHeight};URL.revokeObjectURL(url);resolve(data)}
  v.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Não foi possível ler os dados deste vídeo.'))}
  v.src=url
 })
}
async function frameFromVideo(file:File,time:number){
 return new Promise<Blob>((resolve,reject)=>{
  const v=document.createElement('video'),url=URL.createObjectURL(file)
  v.preload='auto';v.muted=true;v.playsInline=true
  const cleanup=()=>URL.revokeObjectURL(url)
  v.onerror=()=>{cleanup();reject(new Error('Não foi possível gerar a capa do vídeo.'))}
  v.onloadedmetadata=()=>{v.currentTime=clamp(time,0,Math.max(0,v.duration-.05))}
  v.onseeked=()=>{
   const c=document.createElement('canvas');c.width=1080;c.height=1920
   const ctx=c.getContext('2d');if(!ctx){cleanup();reject(new Error('Canvas indisponível.'));return}
   ctx.drawImage(v,0,0,1080,1920)
   c.toBlob(b=>{cleanup();b?resolve(b):reject(new Error('Não foi possível gerar a capa do vídeo.'))},'image/jpeg',.88)
  }
  v.src=url
 })
}
function makeTextOverlay(text:string,x:number,y:number,size:number,align:'left'|'center'|'right'){
 return new Promise<Blob>((resolve,reject)=>{
  const c=document.createElement('canvas');c.width=1080;c.height=1920
  const ctx=c.getContext('2d');if(!ctx){reject(new Error('Canvas indisponível.'));return}
  ctx.clearRect(0,0,c.width,c.height)
  ctx.font=`700 ${Math.round(size*2.1)}px Arial, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle'
  ctx.lineJoin='round';ctx.strokeStyle='rgba(0,0,0,.72)';ctx.lineWidth=Math.max(4,size/7)
  ctx.fillStyle='#fff'
  const px=align==='left'?clamp(x*10.8,40,1040):align==='right'?clamp(x*10.8,40,1040):clamp(x*10.8,80,1000)
  const py=clamp(y*19.2,60,1860)
  ctx.strokeText(text,px,py,980);ctx.fillText(text,px,py,980)
  c.toBlob(b=>b?resolve(b):reject(new Error('Não foi possível preparar o texto.')),'image/png')
 })
}

export default function VideoEditor({file,onCancel,onComplete}:Props){
 const [meta,setMeta]=useState({duration:0,width:0,height:0})
 const [start,setStart]=useState(0),[end,setEnd]=useState(0),[coverTime,setCoverTime]=useState(0)
 const [fit,setFit]=useState<FitMode>('cover'),[zoom,setZoom]=useState(1),[offsetX,setOffsetX]=useState(0),[offsetY,setOffsetY]=useState(0)
 const [rotation,setRotation]=useState(0),[filter,setFilter]=useState<FilterName>('Original')
 const [volume,setVolume]=useState(1),[mute,setMute]=useState(false),[removeAudio,setRemoveAudio]=useState(false),[speed,setSpeed]=useState<(typeof SPEEDS)[number]>(1)
 const [text,setText]=useState(''),[textX,setTextX]=useState(50),[textY,setTextY]=useState(50),[textSize,setTextSize]=useState(34),[textAlign,setTextAlign]=useState<'left'|'center'|'right'>('center')
 const [processing,setProcessing]=useState(false),[progress,setProgress]=useState(0),[step,setStep]=useState('Preparando vídeo'),[error,setError]=useState('')
 const [previewMode,setPreviewMode]=useState(false)
 const videoRef=useRef<HTMLVideoElement>(null),textRef=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;tx:number;ty:number}|null>(null)
 const url=useMemo(()=>URL.createObjectURL(file),[file])
 useEffect(()=>()=>URL.revokeObjectURL(url),[url])
 useEffect(()=>{getVideoMeta(file).then(m=>{setMeta(m);setEnd(m.duration);setCoverTime(Math.min(m.duration/2,3))}).catch(e=>setError(e.message))},[file])
 useEffect(()=>{if(videoRef.current){videoRef.current.volume=clamp(volume,0,1);videoRef.current.muted=mute||removeAudio}},[volume,mute,removeAudio,previewMode])
 const finalDuration=Math.max(.1,(end-start)/speed)
 const videoStyle:React.CSSProperties={
  objectFit:fit==='cover'?'cover':'contain',
  transform:`translate(${offsetX*.22}%,${offsetY*.22}%) scale(${fit==='cover'?zoom:1}) rotate(${rotation}deg)`,
  filter:cssFilter(filter)
 }
 function center(){setOffsetX(0);setOffsetY(0);setZoom(1)}
 function pointerDown(e:React.PointerEvent){if(!text)return;drag.current={x:e.clientX,y:e.clientY,tx:textX,ty:textY};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}
 function pointerMove(e:React.PointerEvent){if(!drag.current)return;const box=(e.currentTarget.parentElement||e.currentTarget).getBoundingClientRect();setTextX(clamp(drag.current.tx+(e.clientX-drag.current.x)/box.width*100,5,95));setTextY(clamp(drag.current.ty+(e.clientY-drag.current.y)/box.height*100,5,95))}
 function pointerUp(){drag.current=null}
 async function process(){
  if(processing)return
  setProcessing(true);setError('');setProgress(2);setStep('Preparando vídeo')
  try{
   if(file.size>MAX_BROWSER_BYTES)throw new Error('Este vídeo ultrapassa o limite de 250 MB.')
   if(end-start<.25)throw new Error('Escolha pelo menos 0,25 segundo de vídeo.')
   setStep('Carregando editor profissional…');setProgress(5)
   const importer=new Function('u','return import(u)') as (u:string)=>Promise<any>
   const [{FFmpeg},{fetchFile,toBlobURL}]=await Promise.all([importer(PKG),importer(UTIL)])
   const ffmpeg=new FFmpeg()
   ffmpeg.on('progress',({progress:p}:{progress:number})=>{const value=clamp(p||0,0,1);setStep(value>.35?'Comprimindo vídeo…':'Processando vídeo…');setProgress(15+Math.round(value*62))})
   setStep('Preparando motor de vídeo…')
   await ffmpeg.load({coreURL:await toBlobURL(`${CORE}/ffmpeg-core.js`,'text/javascript'),wasmURL:await toBlobURL(`${CORE}/ffmpeg-core.wasm`,'application/wasm')})
   const inputExt=file.type==='video/webm'?'webm':file.type==='video/quicktime'?'mov':'mp4'
   const input=`input.${inputExt}`;await ffmpeg.writeFile(input,await fetchFile(file))
   let overlay=false
   if(text.trim()){
    const blob=await makeTextOverlay(text.trim(),textX,textY,textSize,textAlign)
    await ffmpeg.writeFile('overlay.png',await fetchFile(blob));overlay=true
   }
   setStep('Processando vídeo…');setProgress(15)
   const vf:string[]=[]
   if(rotation===90)vf.push('transpose=1');else if(rotation===180)vf.push('transpose=1','transpose=1');else if(rotation===270)vf.push('transpose=2')
   if(fit==='contain')vf.push('scale=1080:1920:force_original_aspect_ratio=decrease','pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black')
   else{
    const sw=Math.round(1080*zoom),sh=Math.round(1920*zoom)
    vf.push(`scale=${sw}:${sh}:force_original_aspect_ratio=increase`,`crop=1080:1920:x='(iw-ow)/2+(iw-ow)*${(offsetX/200).toFixed(4)}':y='(ih-oh)/2+(ih-oh)*${(offsetY/200).toFixed(4)}'`)
   }
   const f=ffFilter(filter);if(f)vf.push(f)
   vf.push(`setpts=PTS/${speed}`)
   const args:string[]=['-ss',start.toFixed(3),'-t',(end-start).toFixed(3),'-i',input]
   if(overlay)args.push('-i','overlay.png')
   if(overlay){args.push('-filter_complex',`[0:v]${vf.join(',')}[base];[base][1:v]overlay=0:0:format=auto[outv]`,'-map','[outv]')}else args.push('-vf',vf.join(','),'-map','0:v:0')
   const crf=(end-start)>180?'29':(end-start)>60?'27':'25'
   args.push('-c:v','libx264','-preset','veryfast','-crf',crf,'-maxrate','6M','-bufsize','12M','-pix_fmt','yuv420p','-movflags','+faststart')
   if(removeAudio)args.push('-an')
   else args.push('-map','0:a?','-c:a','aac','-b:a','128k','-af',`atempo=${speed},volume=${mute?'0':clamp(volume,0,1.5).toFixed(2)}`)
   args.push('-shortest','output.mp4')
   await ffmpeg.exec(args)
   setStep('Comprimindo vídeo…');setProgress(80)
   const data=await ffmpeg.readFile('output.mp4') as Uint8Array
   const outputBlob=new Blob([data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength) as ArrayBuffer],{type:'video/mp4'})
   if(outputBlob.size>MAX_BROWSER_BYTES)throw new Error('O vídeo final ainda ficou acima de 250 MB. Reduza a duração e tente novamente.')
   const video=new File([outputBlob],`fullsend-${crypto.randomUUID()}.mp4`,{type:'video/mp4',lastModified:Date.now()})
   setStep('Gerando capa…');setProgress(88)
   const relativeCover=clamp((coverTime-start)/speed,0,Math.max(.05,finalDuration-.05))
   const coverBlob=await frameFromVideo(video,relativeCover)
   const thumbnail=new File([coverBlob],`fullsend-cover-${crypto.randomUUID()}.jpg`,{type:'image/jpeg',lastModified:Date.now()})
   try{await ffmpeg.deleteFile(input);await ffmpeg.deleteFile('output.mp4');if(overlay)await ffmpeg.deleteFile('overlay.png');ffmpeg.terminate()}catch{}
   setStep('Edição concluída');setProgress(100)
   await onComplete({video,thumbnail,duration:finalDuration,width:1080,height:1920,aspectRatio:'9:16'})
  }catch(e){console.error('FULLSEND video editor:',e);setError('Não foi possível processar este vídeo. Tente novamente.');setStep('Falha no processamento')}
  finally{setProcessing(false)}
 }
 if(previewMode)return <div className="fsve-modal fsve-preview-modal"><div className="fsve-shell fsve-shell-preview"><header><button onClick={()=>setPreviewMode(false)}><ChevronLeft/> Voltar</button><strong>Prévia do mural</strong><span/></header><div className="fsve-phone"><div className="fsve-stage"><video src={url} ref={videoRef} style={videoStyle} controls playsInline muted={mute||removeAudio}/>{text&&<div className="fsve-overlay-text" style={{left:`${textX}%`,top:`${textY}%`,fontSize:`${textSize}px`,textAlign,transform:'translate(-50%,-50%)'}}>{text}</div>}</div></div><button className="fsve-primary" onClick={()=>setPreviewMode(false)}>Continuar editando</button></div></div>
 return <div className="fsve-modal" role="dialog" aria-modal="true" aria-label="Editor de vídeo FULLSEND">
  <div className="fsve-shell">
   <header className="fsve-head"><div><span className="fsve-kicker">FULLSEND STUDIO</span><h2>Editar vídeo</h2><p>Prepare seu vídeo vertical antes de publicar.</p></div><button className="fsve-close" disabled={processing} onClick={onCancel} aria-label="Fechar"><X/></button></header>
   <div className="fsve-layout">
    <aside className="fsve-panel fsve-left">
     <section><h3><Scissors/> Corte</h3><label>Início <b>{start.toFixed(1)}s</b><input type="range" min={0} max={Math.max(.1,end-.25)} step=".1" value={start} disabled={processing} onChange={e=>setStart(Math.min(Number(e.target.value),end-.25))}/></label><label>Final <b>{end.toFixed(1)}s</b><input type="range" min={Math.min(meta.duration,.25)} max={meta.duration||1} step=".1" value={end} disabled={processing} onChange={e=>setEnd(Math.max(Number(e.target.value),start+.25))}/></label><small>Duração final: <strong>{finalDuration.toFixed(1)}s</strong></small></section>
     <section><h3><Move/> Enquadramento 9:16</h3><div className="fsve-segment"><button className={fit==='cover'?'active':''} onClick={()=>setFit('cover')}>Preencher</button><button className={fit==='contain'?'active':''} onClick={()=>{setFit('contain');center()}}>Ajustar</button></div><label><ZoomIn/> Zoom <b>{zoom.toFixed(2)}x</b><input disabled={processing||fit==='contain'} type="range" min="1" max="2.4" step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><label>Horizontal <input disabled={processing||fit==='contain'} type="range" min="-100" max="100" value={offsetX} onChange={e=>setOffsetX(Number(e.target.value))}/></label><label>Vertical <input disabled={processing||fit==='contain'} type="range" min="-100" max="100" value={offsetY} onChange={e=>setOffsetY(Number(e.target.value))}/></label><button className="fsve-secondary" onClick={center}>Centralizar</button></section>
     <section><h3><Film/> Velocidade</h3><div className="fsve-segment">{SPEEDS.map(v=><button key={v} className={speed===v?'active':''} onClick={()=>setSpeed(v)}>{v}x</button>)}</div></section>
    </aside>
    <main className="fsve-center">
     <div className="fsve-stage-wrap"><div className="fsve-stage"><video src={url} ref={videoRef} style={videoStyle} controls playsInline muted={mute||removeAudio}/>{text&&<div ref={textRef} className="fsve-overlay-text draggable" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} style={{left:`${textX}%`,top:`${textY}%`,fontSize:`${textSize}px`,textAlign,transform:'translate(-50%,-50%)'}}>{text}</div>}<span className="fsve-format">9:16 · 1080 × 1920</span></div></div>
     <div className="fsve-preview-actions"><button className="fsve-secondary" disabled={processing} onClick={()=>setPreviewMode(true)}>Visualizar resultado</button><span>{meta.width}×{meta.height} original · {(file.size/1024/1024).toFixed(1)} MB</span></div>
     <section className="fsve-cover"><h3>Capa do vídeo</h3><label>Escolha o momento da capa <b>{coverTime.toFixed(1)}s</b><input type="range" min={start} max={Math.max(start,end)} step=".1" value={clamp(coverTime,start,end)} disabled={processing} onChange={e=>{const t=Number(e.target.value);setCoverTime(t);if(videoRef.current)videoRef.current.currentTime=t}}/></label></section>
    </main>
    <aside className="fsve-panel fsve-right">
     <section><h3><Volume2/> Áudio</h3><label>Volume <b>{Math.round(volume*100)}%</b><input disabled={processing||mute||removeAudio} type="range" min="0" max="1.5" step=".05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label><div className="fsve-checks"><label><input type="checkbox" checked={mute} disabled={processing||removeAudio} onChange={e=>setMute(e.target.checked)}/><VolumeX/> Mute</label><label><input type="checkbox" checked={removeAudio} disabled={processing} onChange={e=>setRemoveAudio(e.target.checked)}/> Remover áudio original</label></div></section>
     <section><h3><RotateCw/> Rotação</h3><div className="fsve-segment fsve-wrap">{[0,90,180,270].map(r=><button key={r} className={rotation===r?'active':''} onClick={()=>setRotation(r)}>{r===0?'Resetar':`${r}°`}</button>)}</div></section>
     <section><h3><Type/> Texto</h3><input className="fsve-text-input" maxLength={80} placeholder="Escreva no vídeo…" value={text} onChange={e=>setText(e.target.value)}/><label>Tamanho <input type="range" min="18" max="64" value={textSize} onChange={e=>setTextSize(Number(e.target.value))}/></label><div className="fsve-segment"><button className={textAlign==='left'?'active':''} onClick={()=>setTextAlign('left')}>Esq.</button><button className={textAlign==='center'?'active':''} onClick={()=>setTextAlign('center')}>Centro</button><button className={textAlign==='right'?'active':''} onClick={()=>setTextAlign('right')}>Dir.</button></div><small>Arraste o texto diretamente sobre o vídeo.</small></section>
     <section><h3><Wand2/> Filtros</h3><div className="fsve-filter-grid">{FILTERS.map(f=><button key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>{f}</button>)}</div></section>
    </aside>
   </div>
   {error&&<div className="fsve-error" role="alert">{error}<button onClick={()=>setError('')}>Tentar novamente</button></div>}
   {processing&&<div className="fsve-progress"><div><strong>{step}</strong><span>{progress}%</span></div><progress max="100" value={progress}/><small>Não feche esta janela durante o processamento.</small></div>}
   <footer className="fsve-footer"><button className="fsve-secondary" disabled={processing} onClick={onCancel}>Cancelar</button><div><small>H.264 · AAC · MP4 · vertical 9:16</small><button className="fsve-primary" disabled={processing||!meta.duration} onClick={process}><Check/> {processing?'Processando…':'Confirmar edição'}</button></div></footer>
  </div>
 </div>
}
