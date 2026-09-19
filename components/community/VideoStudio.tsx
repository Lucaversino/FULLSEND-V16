'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, Image as ImageIcon, Pause, Play, RotateCcw, Save, Scissors, Sparkles, Trash2, Volume2, X } from 'lucide-react'
import './video-studio.css'

type Ratio='vertical'|'square'|'wide'|'original'
type Quality='1080'|'720'|'auto'
type Transition='none'|'fade'|'black'|'flash'
type Segment={id:string;start:number;end:number;keep:boolean;transition:Transition}
type MusicTrack={id:string;file:File;url:string;start:number;volume:number;duration:number;inPoint:number;outPoint:number;muted:boolean}
type Caption={id:string;start:number;end:number;text:string}
type Tool='cut'|'music'|'captions'|'format'|'speed'|'text'|'cover'|'transition'

const uid=()=>crypto.randomUUID()
const fmt=(value:number)=>{const safe=Math.max(0,Number.isFinite(value)?value:0),h=Math.floor(safe/3600),m=Math.floor((safe%3600)/60),s=Math.floor(safe%60),d=Math.floor((safe%1)*10);return h?`${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`:`${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}.${d}`}
const wait=(media:HTMLMediaElement,event:string)=>new Promise<void>((resolve,reject)=>{const done=()=>{clean();resolve()},fail=()=>{clean();reject(new Error('Não foi possível ler esta mídia.'))},clean=()=>{media.removeEventListener(event,done);media.removeEventListener('error',fail)};media.addEventListener(event,done,{once:true});media.addEventListener('error',fail,{once:true})})
function recorderType(){if(typeof MediaRecorder==='undefined')return '';return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))||''}

export default function VideoStudio({file,onCancel,onConfirm}:{file:File;onCancel:()=>void;onConfirm:(file:File)=>void}){
 const sourceUrl=useMemo(()=>URL.createObjectURL(file),[file])
 const videoRef=useRef<HTMLVideoElement>(null),stageRef=useRef<HTMLDivElement>(null),filmstripRef=useRef<HTMLDivElement>(null),musicLaneRef=useRef<HTMLDivElement>(null),musicInput=useRef<HTMLInputElement>(null),tracksRef=useRef<MusicTrack[]>([]),dragRef=useRef<{index:number;startX:number;moved:boolean;snap:boolean}|null>(null),trimRef=useRef<{index:number;edge:'start'|'end';startX:number;originalStart:number;originalEnd:number}|null>(null),musicDragRef=useRef<{id:string;startX:number;originalStart:number}|null>(null),musicTrimRef=useRef<{id:string;edge:'start'|'end';startX:number;originalStart:number;originalIn:number;originalOut:number}|null>(null)
 const [duration,setDuration]=useState(0),[current,setCurrent]=useState(0),[playing,setPlaying]=useState(false),[muted,setMuted]=useState(false),[fullscreen,setFullscreen]=useState(false)
 const [ratio,setRatio]=useState<Ratio>('vertical'),[quality,setQuality]=useState<Quality>('1080'),[speed,setSpeed]=useState<.5|1|1.5|2>(1),[volume,setVolume]=useState(.76),[tool,setTool]=useState<Tool>('cut'),[mobileTool,setMobileTool]=useState<Tool|null>(null)
 const [segments,setSegments]=useState<Segment[]>([]),[activeSegment,setActiveSegment]=useState(0),[undoStack,setUndoStack]=useState<Segment[][]>([]),[sliceStart,setSliceStart]=useState<number|null>(null),[sliceEnd,setSliceEnd]=useState<number|null>(null)
 const [tracks,setTracks]=useState<MusicTrack[]>([]),[activeMusicId,setActiveMusicId]=useState<string|null>(null),[captions,setCaptions]=useState<Caption[]>([]),[overlayText,setOverlayText]=useState(''),[coverTime,setCoverTime]=useState(0)
 const [captionStatus,setCaptionStatus]=useState<'idle'|'working'|'ready'|'error'>('idle'),[captionMessage,setCaptionMessage]=useState('Toque para gerar legendas automáticas no navegador.')
 const [detecting,setDetecting]=useState(false),[exporting,setExporting]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState(''),[thumbnails,setThumbnails]=useState<string[]>([]),[thumbLoading,setThumbLoading]=useState(false)
 const active=segments[activeSegment]
 useEffect(()=>{tracksRef.current=tracks},[tracks])
 useEffect(()=>()=>{URL.revokeObjectURL(sourceUrl);tracksRef.current.forEach(t=>URL.revokeObjectURL(t.url))},[sourceUrl])
 useEffect(()=>{const v=videoRef.current;if(v){v.playbackRate=speed;v.volume=volume;v.muted=muted}},[speed,volume,muted])
 useEffect(()=>{const sync=()=>setFullscreen(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync)},[])

 function clipDuration(segment:Segment){return Math.max(0,segment.end-segment.start)}
 const editDuration=segments.reduce((sum,s)=>sum+clipDuration(s),0)
 const timelineCurrent=segments.slice(0,activeSegment).reduce((sum,s)=>sum+clipDuration(s),0)+(active?Math.max(0,Math.min(clipDuration(active),current-active.start)):0)
 function clipOffset(index:number){return segments.slice(0,index).reduce((sum,s)=>sum+clipDuration(s),0)}
 function previewMusicNode(id:string){return document.getElementById('fs-preview-music-'+id) as HTMLAudioElement|null}
 function stopPreviewMusic(){for(const track of tracksRef.current)previewMusicNode(track.id)?.pause()}
 function syncPreviewMusic(editTime:number,shouldPlay:boolean){
  for(const track of tracksRef.current){
   const audio=previewMusicNode(track.id);if(!audio)continue
   const len=musicLength(track),local=editTime-track.start
   if(local>=0&&local<len){
    const target=Math.max(track.inPoint,Math.min(track.outPoint-.01,track.inPoint+local))
    if(Math.abs(audio.currentTime-target)>.18)audio.currentTime=target
    audio.volume=track.muted?0:track.volume;audio.playbackRate=speed;audio.muted=track.muted
    if(track.muted){if(!audio.paused)audio.pause()}else if(shouldPlay&&audio.paused){audio.play().catch(()=>{})}
   }else if(!audio.paused)audio.pause()
  }
 }
 function armPreviewMusic(editTime:number){
  for(const track of tracksRef.current){
   const audio=previewMusicNode(track.id);if(!audio||track.muted)continue
   const local=editTime-track.start,len=musicLength(track)
   if(local>=0&&local<len){const target=Math.max(track.inPoint,Math.min(track.outPoint-.01,track.inPoint+local));audio.currentTime=target;audio.volume=track.volume;audio.muted=false;audio.play().catch(()=>{})}
   else{const restore=track.volume;audio.volume=0;audio.muted=false;audio.play().then(()=>{audio.pause();audio.volume=restore}).catch(()=>{audio.volume=restore})}
  }
 }
 function snapshot(){setUndoStack(stack=>[...stack.slice(-9),segments.map(s=>({...s}))])}
 function undo(){const prev=undoStack.at(-1);if(!prev)return;setSliceStart(null);setSliceEnd(null);setSegments(prev);setUndoStack(stack=>stack.slice(0,-1));const index=Math.min(activeSegment,Math.max(0,prev.length-1));setActiveSegment(index);const seg=prev[index];if(seg){setCurrent(seg.start);if(videoRef.current)videoRef.current.currentTime=seg.start}}
 function seek(value:number){const next=Math.max(0,Math.min(duration||0,value));setCurrent(next);const v=videoRef.current;if(v&&Math.abs(v.currentTime-next)>.04)v.currentTime=next}
 function timelineLocation(value:number){if(!segments.length)return null;const target=Math.max(0,Math.min(editDuration||0,value));let passed=0;for(let i=0;i<segments.length;i++){const len=clipDuration(segments[i]);if(target<=passed+len||i===segments.length-1)return {index:i,source:segments[i].start+Math.max(0,Math.min(len,target-passed)),local:Math.max(0,Math.min(len,target-passed))};passed+=len}return null}
 function seekTimeline(value:number){const loc=timelineLocation(value);if(!loc)return;setActiveSegment(loc.index);seek(Math.min(segments[loc.index].end-.001,loc.source));syncPreviewMusic(Math.max(0,Math.min(editDuration,value)),false)}
 async function toggle(){const v=videoRef.current;if(!v||!active)return;if(v.paused){let editTime=timelineCurrent;if(current<active.start||current>=active.end-.03){seek(active.start);editTime=clipOffset(activeSegment)}v.playbackRate=speed;v.volume=volume;v.muted=muted;armPreviewMusic(editTime);await v.play().catch(()=>{stopPreviewMusic();setError('O navegador bloqueou a reprodução. Toque novamente.')})}else{v.pause();stopPreviewMusic()}}
 function jump(seconds:number){seekTimeline(timelineCurrent+seconds)}
 function stepFrame(direction:-1|1){videoRef.current?.pause();stopPreviewMusic();seekTimeline(timelineCurrent+direction/30)}
 function cycleSpeed(){const values=[.5,1,1.5,2] as const;const next=values[(values.indexOf(speed)+1)%values.length];setSpeed(next)}
 async function toggleFullscreen(){const stage=stageRef.current;if(!stage)return;try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen()}catch{setError('Tela cheia não está disponível neste navegador.')}}
 async function buildThumbnails(total:number){
  if(!total)return;setThumbLoading(true);setThumbnails([])
  const probe=document.createElement('video');probe.src=sourceUrl;probe.preload='auto';probe.playsInline=true;probe.muted=true;probe.setAttribute('playsinline','');probe.style.cssText='position:fixed;left:-9999px;top:0;width:180px;height:102px;opacity:.01;pointer-events:none';document.body.appendChild(probe)
  const waitEvent=(event:string,ms=1800)=>new Promise<void>(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;probe.removeEventListener(event,finish);clearTimeout(timer);resolve()};const timer=window.setTimeout(finish,ms);probe.addEventListener(event,finish,{once:true})})
  try{
   probe.load();if(probe.readyState<2)await waitEvent('loadeddata',2600)
   await probe.play().catch(()=>{});await new Promise<void>(resolve=>window.setTimeout(resolve,80));probe.pause()
   const count=Math.min(24,Math.max(12,Math.ceil(total*1.8))),canvas=document.createElement('canvas');canvas.width=160;canvas.height=90
   const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas indisponível')
   const frames:string[]=[]
   for(let i=0;i<count;i++){
    const target=Math.min(Math.max(0,total-.08),(i+.5)/count*total)
    probe.currentTime=target;await waitEvent('seeked',1100)
    if(probe.readyState<2)await waitEvent('loadeddata',700)
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))
    ctx.fillStyle='#0b0d11';ctx.fillRect(0,0,canvas.width,canvas.height)
    if(probe.videoWidth&&probe.videoHeight){const sr=probe.videoWidth/probe.videoHeight,tr=canvas.width/canvas.height;let sx=0,sy=0,sw=probe.videoWidth,sh=probe.videoHeight;if(sr>tr){sw=probe.videoHeight*tr;sx=(probe.videoWidth-sw)/2}else{sh=probe.videoWidth/tr;sy=(probe.videoHeight-sh)/2}ctx.drawImage(probe,sx,sy,sw,sh,0,0,canvas.width,canvas.height)}
    frames.push(canvas.toDataURL('image/jpeg',.74))
    if(i===2||i===5)setThumbnails([...frames])
   }
   setThumbnails(frames)
  }catch{setThumbnails([])}finally{probe.pause();probe.removeAttribute('src');probe.load();probe.remove();setThumbLoading(false)}
 }
 function thumbnailAt(time:number){if(!thumbnails.length||!duration)return '';const i=Math.max(0,Math.min(thumbnails.length-1,Math.round(time/duration*(thumbnails.length-1))));return thumbnails[i]}
 function clipFrames(segment:Segment){const len=clipDuration(segment),count=len>8?4:len>3?3:2;return Array.from({length:count},(_,i)=>thumbnailAt(segment.start+(i+.5)/count*len)).filter(Boolean)}
 function transitionLabel(value:Transition){return value==='fade'?'SUAVE':value==='black'?'PRETO':value==='flash'?'FLASH':'SEM'}
 function applyTransition(value:Transition){if(!active)return;snapshot();setSegments(items=>items.map((s,i)=>i===activeSegment?{...s,transition:value}:s))}
 function selectSegment(index:number,sourceTime?:number){const seg=segments[index];if(!seg)return;setActiveSegment(index);seek(sourceTime==null?seg.start:Math.max(seg.start,Math.min(seg.end-.001,sourceTime)))}
 function deleteSegment(index:number){setSliceStart(null);setSliceEnd(null);if(segments.length<=1){setError('Faça um corte primeiro. É preciso manter pelo menos um trecho na timeline.');return}snapshot();const next=segments.filter((_,i)=>i!==index),nextIndex=Math.min(index,next.length-1);setSegments(next);setActiveSegment(nextIndex);const seg=next[nextIndex];if(seg){setCurrent(seg.start);if(videoRef.current)videoRef.current.currentTime=seg.start}}
 function reorderSegment(from:number,to:number){if(from===to||from<0||to<0||from>=segments.length||to>=segments.length)return;setSegments(items=>{const next=[...items],picked=next.splice(from,1)[0];next.splice(to,0,picked);return next});setActiveSegment(to)}
 function trimSegment(index:number,edge:'start'|'end',deltaTimeline:number,originalStart:number,originalEnd:number){const segment=segments[index];if(!segment)return;const sourceDelta=deltaTimeline;const minLen=.25;let start=originalStart,end=originalEnd;if(edge==='start')start=Math.max(0,Math.min(originalEnd-minLen,originalStart+sourceDelta));else end=Math.min(duration,Math.max(originalStart+minLen,originalEnd+sourceDelta));setSegments(items=>items.map((s,i)=>i===index?{...s,start,end}:s));setActiveSegment(index);const source=edge==='start'?start:end-.001;setCurrent(source);if(videoRef.current)videoRef.current.currentTime=Math.max(start,Math.min(end-.001,source))}
 function clipIndexAtClientX(clientX:number){const el=filmstripRef.current;if(!el||!segments.length)return 0;const rect=el.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(clientX-rect.left)/Math.max(1,rect.width))),target=ratio*editDuration;let passed=0;for(let i=0;i<segments.length;i++){passed+=clipDuration(segments[i]);if(target<=passed)return i}return segments.length-1}

 function patchActive(patch:Partial<Segment>){if(!active)return;snapshot();setSegments(items=>items.map((s,i)=>i===activeSegment?{...s,...patch}:s))}
 function splitHere(){const loc=timelineLocation(timelineCurrent);if(!loc)return;const target=segments[loc.index],cut=loc.source;if(!target||cut<=target.start+.08||cut>=target.end-.08){setError('Posicione a agulha dentro do clipe, longe das bordas, para cortar.');return}snapshot();const left:Segment={...target,id:uid(),end:cut,transition:'none'},right:Segment={...target,id:uid(),start:cut};setSegments(items=>{const next=[...items];next.splice(loc.index,1,left,right);return next});setActiveSegment(loc.index+1);setCurrent(right.start);if(videoRef.current)videoRef.current.currentTime=right.start;setError('')}
 function markSliceCut(){
  if(!editDuration)return
  if(sliceStart===null||sliceEnd!==null){setSliceStart(timelineCurrent);setSliceEnd(null);setError('');return}
  if(Math.abs(timelineCurrent-sliceStart)<.08){setError('Mova a agulha para outro ponto antes de fazer o segundo corte.');return}
  setSliceEnd(timelineCurrent);setError('')
 }
 function removeSlice(){
  if(sliceStart===null||sliceEnd===null)return
  const a=Math.max(0,Math.min(sliceStart,sliceEnd)),b=Math.min(editDuration,Math.max(sliceStart,sliceEnd))
  if(b-a<.08){setError('O trecho selecionado é pequeno demais para remover.');return}
  snapshot()
  const next:Segment[]=[];let passed=0
  for(const segment of segments){
   const len=clipDuration(segment),t0=passed,t1=passed+len
   if(b<=t0+.0001||a>=t1-.0001){next.push({...segment});passed=t1;continue}
   const localStart=Math.max(0,a-t0),localEnd=Math.min(len,b-t0)
   if(localStart>.03)next.push({...segment,id:uid(),end:segment.start+localStart,transition:'none'})
   if(localEnd<len-.03)next.push({...segment,id:uid(),start:segment.start+localEnd})
   passed=t1
  }
  if(!next.length){setError('Não é possível apagar o vídeo inteiro.');return}
  const hasLeft=a>.03,hasRight=b<editDuration-.03
  let joinIndex=-1
  if(hasLeft&&hasRight){
   let sum=0
   for(let i=0;i<next.length;i++){sum+=clipDuration(next[i]);if(sum>=a-.03){joinIndex=i;break}}
   if(joinIndex>=0&&joinIndex<next.length-1)next[joinIndex]={...next[joinIndex],transition:'fade'}
  }
  setSegments(next)
  const removed=b-a
  setTracks(items=>items.map(t=>{if(t.start>=b)return {...t,start:Math.max(0,t.start-removed)};if(t.start>a&&t.start<b)return {...t,start:a};return t}))
  const selectedIndex=joinIndex>=0?joinIndex:Math.max(0,Math.min(next.length-1,hasLeft?next.length-1:0))
  setActiveSegment(selectedIndex)
  const selected=next[selectedIndex]
  const source=joinIndex>=0?Math.max(selected.start,selected.end-.04):selected.start
  setCurrent(source);if(videoRef.current)videoRef.current.currentTime=source
  setSliceStart(null);setSliceEnd(null);setTool('transition');setMobileTool('transition');setError('')
 }
 function clearSlice(){setSliceStart(null);setSliceEnd(null)}

 function toggleKeep(index:number){deleteSegment(index)}
 function deleteActive(){deleteSegment(activeSegment)}
 function restoreActive(){}

 async function smartCut(){
  const source=videoRef.current;if(!source||!duration||detecting)return;setDetecting(true);setError('');const old=source.currentTime,wasPlaying=!source.paused;source.pause()
  try{
   const canvas=document.createElement('canvas');canvas.width=96;canvas.height=54;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Seu navegador não conseguiu iniciar a análise de cenas.')
   const step=Math.max(2,Math.min(8,duration/70)),marks:number[]=[];let previous:Uint8ClampedArray|null=null
   for(let t=0;t<duration;t+=step){source.currentTime=Math.min(duration-.05,t);await wait(source,'seeked').catch(()=>{});ctx.drawImage(source,0,0,canvas.width,canvas.height);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;if(previous){let diff=0;for(let i=0;i<data.length;i+=16)diff+=Math.abs(data[i]-previous[i])+Math.abs(data[i+1]-previous[i+1])+Math.abs(data[i+2]-previous[i+2]);const normalized=diff/(data.length/16*765);if(normalized>.19)marks.push(t)}previous=new Uint8ClampedArray(data)}
   const minGap=Math.max(8,Math.min(25,duration/14)),filtered=marks.filter((time,index)=>index===0||time-marks[index-1]>minGap),bounds=[0,...filtered,duration].sort((a,b)=>a-b);let detected:Segment[]=[]
   for(let i=0;i<bounds.length-1;i++)if(bounds[i+1]-bounds[i]>.7)detected.push({id:uid(),start:bounds[i],end:bounds[i+1],keep:true,transition:'none'})
   if(detected.length<2){const count=Math.min(5,Math.max(2,Math.ceil(duration/75))),size=duration/count;detected=Array.from({length:count},(_,i)=>({id:uid(),start:i*size,end:i===count-1?duration:(i+1)*size,keep:true,transition:'none'}))}
   snapshot();setSegments(detected);setActiveSegment(0);seek(detected[0]?.start||0)
  }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível analisar as cenas.')}finally{source.currentTime=old;if(wasPlaying)source.play().catch(()=>{});setDetecting(false)}
 }

 function musicLength(track:MusicTrack){return Math.max(.05,track.outPoint-track.inPoint)}
 function moveMusic(id:string,start:number){setTracks(items=>items.map(t=>t.id===id?{...t,start:Math.max(0,Math.min(Math.max(0,editDuration-musicLength(t)),start))}:t))}
 function trimMusic(id:string,edge:'start'|'end',deltaTimeline:number,originalStart:number,originalIn:number,originalOut:number){setTracks(items=>items.map(t=>{if(t.id!==id)return t;const min=.25;if(edge==='start'){const maxDelta=Math.max(0,originalOut-originalIn-min),delta=Math.max(-originalIn,Math.min(maxDelta,deltaTimeline)),nextIn=Math.max(0,originalIn+delta),nextStart=Math.max(0,originalStart+delta);return {...t,inPoint:nextIn,start:nextStart}}const maxOut=Math.min(t.duration,originalOut+deltaTimeline);return {...t,outPoint:Math.max(originalIn+min,maxOut)}}))}
 function addMusic(files:FileList|null){const picked=Array.from(files||[]).slice(0,Math.max(0,4-tracks.length));for(const f of picked){if(!f.type.startsWith('audio/')){setError('Escolha somente arquivos de áudio.');continue}if(f.size>25*1024*1024){setError('Cada música pode ter no máximo 25 MB.');continue}const url=URL.createObjectURL(f),audio=new Audio(url);audio.preload='metadata';audio.onloadedmetadata=()=>{const d=Number.isFinite(audio.duration)?audio.duration:0,id=uid(),start=Math.max(0,Math.min(editDuration,timelineCurrent));setTracks(items=>items.length>=4?items:[...items,{id,file:f,url,start,volume:.8,duration:d,inPoint:0,outPoint:d,muted:false}]);setActiveMusicId(id);setTool('music');setMobileTool('music')};audio.onerror=()=>{URL.revokeObjectURL(url);setError(`Não foi possível abrir ${f.name}.`)}}}
 function updateTrack(id:string,patch:Partial<MusicTrack>){setTracks(items=>items.map(t=>t.id===id?{...t,...patch}:t))}
 function removeTrack(id:string){const audio=previewMusicNode(id);if(audio)audio.pause();setTracks(items=>{const found=items.find(t=>t.id===id);if(found)URL.revokeObjectURL(found.url);const next=items.filter(t=>t.id!==id);if(activeMusicId===id)setActiveMusicId(next[0]?.id||null);return next})}

 async function generateCaptions(){
  if(captionStatus==='working'||!duration)return;setCaptionStatus('working');setCaptionMessage('Analisando a fala do vídeo no navegador…');setError('')
  const Speech=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!Speech){setCaptionStatus('error');setCaptionMessage('Este navegador não oferece transcrição automática. Use Chrome ou Edge atualizado.');return}
  const probe=document.createElement('video');probe.src=sourceUrl;probe.preload='auto';probe.playsInline=true;probe.muted=true
  try{
   if(probe.readyState<1)await wait(probe,'loadedmetadata');const start=active?.start??0,end=active?.end??duration;probe.currentTime=start;await wait(probe,'seeked').catch(()=>{});await probe.play();const stream=(probe as any).captureStream?.()||(probe as any).mozCaptureStream?.(),audioTrack=stream?.getAudioTracks?.()[0];if(!audioTrack){probe.pause();throw new Error('O navegador não liberou o áudio do vídeo para transcrição.')}
   const recognition=new Speech();recognition.lang='pt-BR';recognition.continuous=true;recognition.interimResults=false;recognition.maxAlternatives=1;const generated:Caption[]=[];let lastTime=start
   recognition.onresult=(event:any)=>{for(let i=event.resultIndex;i<event.results.length;i++){const result=event.results[i];if(!result.isFinal)continue;const text=String(result[0]?.transcript||'').trim();if(!text)continue;const finish=Math.min(end,Math.max(lastTime+1,probe.currentTime));generated.push({id:uid(),start:lastTime,end:finish,text});lastTime=finish;setCaptions([...generated])}}
   const done=new Promise<void>((resolve,reject)=>{recognition.onerror=(event:any)=>reject(new Error(event?.error==='not-allowed'?'O navegador bloqueou a transcrição de áudio.':`Falha na transcrição: ${event?.error||'erro desconhecido'}.`));recognition.onend=()=>resolve()})
   const timer=window.setInterval(()=>{if(probe.currentTime>=end-.1||probe.ended){probe.pause();try{recognition.stop()}catch{}}},180);try{recognition.start(audioTrack)}catch{throw new Error('Seu navegador não aceita transcrever diretamente o áudio do vídeo. Atualize o Chrome/Edge ou edite a legenda manualmente.')}await done;window.clearInterval(timer);probe.pause();audioTrack.stop?.();if(!generated.length)throw new Error('Não foi detectada fala nesse trecho. Você pode escrever a legenda manualmente.');setCaptions(generated);setCaptionStatus('ready');setCaptionMessage(`Português (Brasil) · ${generated.length} trecho${generated.length===1?'':'s'} gerado${generated.length===1?'':'s'}`)
  }catch(cause){probe.pause();setCaptionStatus('error');setCaptionMessage(cause instanceof Error?cause.message:'Não foi possível gerar as legendas.')}
 }
 const captionAt=(time:number)=>captions.find(c=>time>=c.start&&time<=c.end)

 function dimensions(video:HTMLVideoElement){if(ratio==='vertical')return quality==='720'?{width:720,height:1280}:{width:1080,height:1920};if(ratio==='square'){const side=quality==='720'?720:1080;return {width:side,height:side}};if(ratio==='wide')return quality==='720'?{width:1280,height:720}:{width:1920,height:1080};const max=quality==='720'?1280:quality==='1080'?1920:Math.max(video.videoWidth,video.videoHeight),scale=Math.min(1,max/Math.max(video.videoWidth,video.videoHeight));return {width:Math.max(2,Math.round(video.videoWidth*scale/2)*2),height:Math.max(2,Math.round(video.videoHeight*scale/2)*2)}}
 function drawFrame(ctx:CanvasRenderingContext2D,video:HTMLVideoElement,width:number,height:number,time:number,useOriginal:boolean){ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);const sr=video.videoWidth/video.videoHeight,tr=width/height;let sx=0,sy=0,sw=video.videoWidth,sh=video.videoHeight;if(!useOriginal&&ratio!=='original'){if(sr>tr){sw=video.videoHeight*tr;sx=(video.videoWidth-sw)/2}else{sh=video.videoWidth/tr;sy=(video.videoHeight-sh)/2}}ctx.drawImage(video,sx,sy,sw,sh,0,0,width,height);if(useOriginal)return;const text=captionAt(time)?.text||overlayText.trim();if(!text)return;const font=Math.max(24,Math.round(width*.035));ctx.font=`700 ${font}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';const maxWidth=width*.82,words=text.toUpperCase().split(/\s+/),lines:string[]=[];let line='';for(const word of words){const next=line?`${line} ${word}`:word;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);const lh=font*1.25,pad=font*.55,boxH=lines.length*lh+pad*2,y=height*.79;ctx.fillStyle='rgba(0,0,0,.76)';ctx.fillRect(width*.08,y-boxH/2,width*.84,boxH);lines.forEach((value,index)=>{ctx.fillStyle=index===lines.length-1&&lines.length>1?'#ff3047':'#fff';ctx.fillText(value,width/2,y-boxH/2+pad+lh*(index+.5),maxWidth)})}
 function drawTransition(ctx:CanvasRenderingContext2D,width:number,height:number,segment:Segment,time:number,previous:Transition='none'){const span=Math.min(.35,clipDuration(segment)/3),into=Math.max(0,Math.min(1,(time-segment.start)/Math.max(.05,span))),out=Math.max(0,Math.min(1,(time-(segment.end-span))/Math.max(.05,span)));let opacity=0,color='#000';if(previous!=='none'&&time<segment.start+span){opacity=1-into;color=previous==='flash'?'#fff':'#000';if(previous==='fade')opacity*=.65}if(segment.transition!=='none'&&time>segment.end-span){opacity=Math.max(opacity,out);color=segment.transition==='flash'?'#fff':'#000';if(segment.transition==='fade')opacity*=.65}if(opacity>0){ctx.save();ctx.globalAlpha=Math.min(1,opacity);ctx.fillStyle=color;ctx.fillRect(0,0,width,height);ctx.restore()}}

 async function exportVideo(useOriginal=false){
  if(exporting||!duration)return;const kept:Segment[]=useOriginal?[{id:'original',start:0,end:duration,keep:true,transition:'none'}]:segments;if(!kept.length){setError('Mantenha pelo menos um clip na timeline.');return}const mime=recorderType();if(!mime){setError('Este navegador não possui exportação de vídeo compatível. Use Chrome ou Edge atualizado.');return}setExporting(true);setProgress(0);setError('');let context:AudioContext|null=null
  try{
   const render=document.createElement('video');render.src=sourceUrl;render.preload='auto';render.playsInline=true;if(render.readyState<1)await wait(render,'loadedmetadata');const canvas=document.createElement('canvas'),size=useOriginal?(()=>{const max=Math.max(render.videoWidth,render.videoHeight),scale=Math.min(1,1920/max);return {width:Math.max(2,Math.round(render.videoWidth*scale/2)*2),height:Math.max(2,Math.round(render.videoHeight*scale/2)*2)}})():dimensions(render);canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Não foi possível iniciar o renderizador.');const stream=canvas.captureStream(30);context=new AudioContext();const destination=context.createMediaStreamDestination(),mainSource=context.createMediaElementSource(render),mainGain=context.createGain();mainGain.gain.value=useOriginal?1:volume;mainSource.connect(mainGain).connect(destination)
   const audios=(useOriginal?[]:tracks).map(track=>{const audio=new Audio(track.url),source=context!.createMediaElementSource(audio),gain=context!.createGain();gain.gain.value=track.muted?0:track.volume;source.connect(gain).connect(destination);return {track,audio,started:false}}),mixed=new MediaStream([...stream.getVideoTracks(),...destination.stream.getAudioTracks()]),recorder=new MediaRecorder(mixed,{mimeType:mime,videoBitsPerSecond:quality==='720'?3800000:6500000,audioBitsPerSecond:160000}),chunks:BlobPart[]=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}
   const complete=new Promise<File>((resolve,reject)=>{recorder.onerror=()=>reject(new Error('O navegador interrompeu a exportação.'));recorder.onstop=()=>{const type=recorder.mimeType||mime,blob=new Blob(chunks,{type});if(!blob.size){reject(new Error('O vídeo exportado ficou vazio.'));return}const mp4=type.includes('mp4'),name=file.name.replace(/\.[^.]+$/,'');resolve(new File([blob],`${name}-fullsend.${mp4?'mp4':'webm'}`,{type:mp4?'video/mp4':'video/webm',lastModified:Date.now()}))}}),total=kept.reduce((sum,s)=>sum+s.end-s.start,0);let rendered=0;await context.resume();recorder.start(1000)
   for(let segmentIndex=0;segmentIndex<kept.length;segmentIndex++){const segment=kept[segmentIndex];render.currentTime=segment.start;await wait(render,'seeked').catch(()=>{});render.playbackRate=useOriginal?1:speed;await render.play();await new Promise<void>((resolve,reject)=>{let raf=0;const paint=()=>{try{const sourceTime=render.currentTime;drawFrame(ctx,render,canvas.width,canvas.height,sourceTime,useOriginal);if(!useOriginal)drawTransition(ctx,canvas.width,canvas.height,segment,sourceTime,segmentIndex>0?kept[segmentIndex-1].transition:'none');audios.forEach(item=>{const editTime=rendered+Math.max(0,sourceTime-segment.start),local=editTime-item.track.start,len=musicLength(item.track);if(local>=0&&local<len){item.audio.volume=item.track.muted?0:item.track.volume;item.audio.muted=item.track.muted;item.audio.playbackRate=useOriginal?1:speed;const target=item.track.inPoint+local;if(!item.started){item.started=true;item.audio.currentTime=Math.max(item.track.inPoint,Math.min(item.track.outPoint-.01,target));item.audio.play().catch(()=>{})}}else if(item.started){item.audio.pause();item.started=false}});setProgress(Math.min(99,(rendered+Math.max(0,Math.min(segment.end,sourceTime)-segment.start))/Math.max(.1,total)*100));if(sourceTime>=segment.end-.03||render.ended){render.pause();audios.forEach(item=>{item.audio.pause();item.started=false});resolve();return}raf=requestAnimationFrame(paint)}catch(cause){cancelAnimationFrame(raf);reject(cause)}};raf=requestAnimationFrame(paint);render.addEventListener('error',()=>{cancelAnimationFrame(raf);reject(new Error('O vídeo apresentou erro durante a exportação.'))},{once:true})});rendered+=segment.end-segment.start}
   recorder.stop();const output=await complete;setProgress(100);onConfirm(output)
  }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível exportar o vídeo.')}finally{await context?.close().catch(()=>{});setExporting(false)}
 }

 const totalKept=segments.reduce((sum,s)=>sum+s.end-s.start,0),currentCaption=captionAt(current),type=recorderType(),outputLabel=type.includes('mp4')?'MP4 · H.264':'WebM · compatível com o mural'
 const tools:[Tool,string,string,string][]=[['cut','✂','Cortar','Corte e divisão'],['transition','◇','Transição','Entre os cortes'],['music','♫','Música','Adicionar faixa de áudio'],['text','T','Texto','Títulos e chamadas'],['format','▣','Formato','9:16 · 1:1 · 16:9'],['speed','⚡','Velocidade','0.5x até 2x'],['cover','▧','Capa','Escolher frame de capa']]

 return <div className="fs-figma-backdrop" role="dialog" aria-modal="true" aria-label="FULLSEND Video Studio"><section className="fs-figma-studio">
  <header className="fs-figma-header"><div className="fs-desktop-brand"><strong>FULLSEND VIDEO STUDIO</strong><span>Editar vídeo · {file.name}</span></div><div className="fs-mobile-brand"><button type="button" onClick={onCancel} disabled={exporting}><ChevronLeft/></button><strong>STUDIO</strong></div><div className="fs-header-actions"><button type="button" className="fs-save-draft" disabled={exporting}><Save size={14}/><span>SALVAR RASCUNHO</span></button><button type="button" className="fs-export-top" onClick={()=>exportVideo(false)} disabled={exporting||!duration}>{exporting?'EXPORTANDO…':'GERAR VÍDEO'}</button><button type="button" className="fs-close" onClick={onCancel} disabled={exporting}><X/></button></div></header>
  <div className="fs-preview-audio-bin" aria-hidden="true">{tracks.map(track=><audio key={track.id} id={'fs-preview-music-'+track.id} src={track.url} preload="auto" />)}</div>

  <div className="fs-figma-workspace"><aside className="fs-tools-sidebar"><span className="fs-side-label">FERRAMENTAS</span>{tools.map(([value,icon,title,description])=><button type="button" key={value} className={tool===value?'active':''} onClick={()=>setTool(value)}><b>{icon}</b><span><strong>{title}</strong><small>{description}</small></span></button>)}<div className="fs-auto-cut-card"><strong>CORTE AUTOMÁTICO</strong><b>Clipes longos</b><span>Detecta mudanças de cena localmente, sem API e sem enviar o vídeo.</span><button type="button" onClick={smartCut} disabled={detecting||exporting}>{detecting?'ANALISANDO…':'ANALISAR CENAS'}</button></div></aside>

   <main className="fs-preview-workspace"><div className="fs-preview-badges"><span className="fs-long-badge">● VÍDEO {duration>180?'LONGO · ':''}{fmt(duration)}</span><span className={captionStatus==='ready'?'fs-caption-ready':'fs-caption-badge'}>{captionStatus==='ready'?'✓ LEGENDAS GERADAS':'CC LEGENDAS'}</span></div><div ref={stageRef} className={`fs-video-stage ratio-${ratio}`}><video ref={videoRef} src={sourceUrl} playsInline preload="metadata" onLoadedMetadata={e=>{const d=Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0;setDuration(d);setSegments([{id:uid(),start:0,end:d,keep:true,transition:'none'}]);setCoverTime(0);e.currentTarget.volume=volume;buildThumbnails(d)}} onPlay={()=>{setPlaying(true);syncPreviewMusic(timelineCurrent,true)}} onPause={()=>{setPlaying(false);stopPreviewMusic()}} onTimeUpdate={e=>{const time=e.currentTarget.currentTime;setCurrent(time);const seg=segments[activeSegment],editTime=clipOffset(activeSegment)+(seg?Math.max(0,Math.min(clipDuration(seg),time-seg.start)):0);syncPreviewMusic(editTime,!e.currentTarget.paused);if(seg&&time>=seg.end-.025&&!e.currentTarget.paused){const next=activeSegment+1;if(next<segments.length){setActiveSegment(next);e.currentTarget.currentTime=segments[next].start;e.currentTarget.play().catch(()=>{})}else{e.currentTarget.pause();stopPreviewMusic()}}}}/>{(currentCaption?.text||overlayText.trim())&&<div className="fs-caption-preview"><span>{currentCaption?.text||overlayText}</span></div>}</div><div className="fs-playback fs-desktop-player"><button type="button" title="Voltar 5 segundos" onClick={()=>jump(-5)}>−5</button><button type="button" className="main" title={playing?'Pausar':'Reproduzir'} onClick={toggle}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><button type="button" title="Avançar 5 segundos" onClick={()=>jump(5)}>+5</button><span>{fmt(timelineCurrent)} / {fmt(editDuration)}</span><input type="range" min="0" max={duration||1} step=".01" value={Math.min(current,duration||0)} onChange={e=>seek(Number(e.target.value))}/><button type="button" title="Áudio" onClick={()=>setMuted(value=>!value)}>{muted?'🔇':'🔊'}</button><button type="button" title="Velocidade" onClick={cycleSpeed}>{speed}x</button><button type="button" title="Tela cheia" onClick={toggleFullscreen}>{fullscreen?'⤢':'⛶'}</button></div></main>

   <aside className="fs-properties"><span className="fs-side-label">PROPRIEDADES</span>
    {tool==='cut'&&<div className="fs-property-stack"><section><h3>CORTE ATUAL</h3><div className="fs-time-grid"><label>INÍCIO<input type="number" min="0" max={active?.end||duration} step=".1" value={active?.start??0} onChange={e=>patchActive({start:Math.min(Number(e.target.value),Math.max(0,(active?.end||duration)-.2))})}/></label><label>FIM<input type="number" min={active?.start||0} max={duration} step=".1" value={active?.end??duration} onChange={e=>patchActive({end:Math.max(Number(e.target.value),(active?.start||0)+.2)})}/></label></div><div className="fs-action-grid"><button type="button" onClick={()=>active&&patchActive({start:current})} disabled={!active||current>=active.end-.2}>INÍCIO AQUI</button><button type="button" onClick={()=>active&&patchActive({end:current})} disabled={!active||current<=active.start+.2}>FIM AQUI</button></div></section><section><h3>DIVISÃO</h3><button type="button" className="fs-wide-action" onClick={splitHere} disabled={!active}>✂ DIVIDIR NA AGULHA</button><button type="button" className="fs-wide-action" onClick={deleteActive} disabled={!active||segments.length<=1}>🗑 EXCLUIR CLIPE</button><small>Excluir retira o clipe do vídeo final sem apagar o arquivo original. Você pode restaurar ou desfazer.</small></section></div>}
    {tool==='format'&&<div className="fs-property-stack"><section><h3>FORMATO</h3><div className="fs-format-grid">{([['vertical','9:16'],['square','1:1'],['wide','16:9'],['original','Original']] as [Ratio,string][]).map(([value,label])=><button type="button" key={value} className={ratio===value?'active':''} onClick={()=>setRatio(value)}>{label}</button>)}</div></section><section><h3>QUALIDADE</h3><div className="fs-quality-grid">{([['1080','1080p'],['720','720p'],['auto','Auto']] as [Quality,string][]).map(([value,label])=><button type="button" key={value} className={quality===value?'active':''} onClick={()=>setQuality(value)}>{label}</button>)}</div></section></div>}
    {tool==='transition'&&<div className="fs-property-stack"><section><h3>TRANSIÇÃO APÓS O CLIPE</h3><div className="fs-format-grid">{([['none','Sem'],['fade','Suave'],['black','Preto'],['flash','Flash']] as [Transition,string][]).map(([value,label])=><button type="button" key={value} className={active?.transition===value?'active':''} onClick={()=>applyTransition(value)}>{label}</button>)}</div><small>A transição é aplicada entre o clipe selecionado e o próximo.</small></section></div>}
    {tool==='speed'&&<div className="fs-property-stack"><section><h3>VELOCIDADE</h3><div className="fs-speed-grid">{([.5,1,1.5,2] as const).map(value=><button type="button" key={value} className={speed===value?'active':''} onClick={()=>setSpeed(value)}>{value}x</button>)}</div></section></div>}
    {tool==='music'&&<div className="fs-property-stack"><section><h3>♫ MÚSICAS</h3><p>{tracks.length} faixa{tracks.length===1?'':'s'} adicionada{tracks.length===1?'':'s'} · máximo 4</p><input ref={musicInput} hidden type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg" multiple onChange={e=>{addMusic(e.target.files);e.target.value=''}}/>{tracks.map(track=><div className="fs-music-row" key={track.id}><div><b>{track.file.name}</b><small>entra em {fmt(track.start)}</small></div><label><Volume2 size={12}/><input type="range" min="0" max="1" step=".05" value={track.volume} onChange={e=>updateTrack(track.id,{volume:Number(e.target.value)})}/></label><button type="button" onClick={()=>removeTrack(track.id)}><Trash2 size={13}/></button></div>)}<button type="button" className="fs-add-music" disabled={tracks.length>=4} onClick={()=>musicInput.current?.click()}>＋ ADICIONAR MÚSICA</button></section></div>}
    {tool==='captions'&&<div className="fs-property-stack"><section className="fs-caption-panel"><h3>CC LEGENDAS AUTOMÁTICAS</h3><p className={captionStatus==='error'?'error':captionStatus==='ready'?'ready':''}>{captionMessage}</p><button type="button" className="fs-wide-action" onClick={generateCaptions} disabled={captionStatus==='working'}>{captionStatus==='working'?'GERANDO…':captionStatus==='ready'?'REGERAR LEGENDAS':'GERAR LEGENDAS'}</button>{captions.map((caption,index)=><label className="fs-caption-edit" key={caption.id}><span>{fmt(caption.start)}–{fmt(caption.end)}</span><textarea rows={2} value={caption.text} onChange={e=>setCaptions(items=>items.map((c,i)=>i===index?{...c,text:e.target.value}:c))}/></label>)}</section></div>}
    {tool==='text'&&<div className="fs-property-stack"><section><h3>TEXTO</h3><textarea rows={4} value={overlayText} maxLength={120} placeholder="Título ou chamada no vídeo…" onChange={e=>setOverlayText(e.target.value)}/><small>O texto aparece na área inferior e é gravado no vídeo exportado.</small></section></div>}
    {tool==='cover'&&<div className="fs-property-stack"><section><h3>CAPA</h3><p>Frame escolhido: {fmt(coverTime)}</p><button type="button" className="fs-wide-action" onClick={()=>setCoverTime(current)}><ImageIcon size={14}/> USAR FRAME ATUAL</button><small>A capa fica salva nesta edição enquanto o editor está aberto.</small></section></div>}
    <section className="fs-original-audio"><h3>ÁUDIO ORIGINAL</h3><div><input type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/><b>{Math.round(volume*100)}%</b></div></section><section className="fs-output-card"><h3>SAÍDA</h3><b>{outputLabel}</b><span>{ratio==='vertical'?'1080 × 1920':ratio==='square'?'1080 × 1080':ratio==='wide'?'1920 × 1080':'Resolução original'} · {quality==='720'?'720p':quality==='auto'?'Auto':'1080p'}</span><button type="button" onClick={()=>exportVideo(false)} disabled={exporting||!duration}>GERAR VÍDEO</button></section>
   </aside></div>

  <section className="fs-mobile-player" aria-label="Player do vídeo">
   <button type="button" aria-label="Voltar 5 segundos" onClick={()=>jump(-5)}>−5</button>
   <button type="button" className="play" aria-label={playing?'Pausar':'Reproduzir'} onClick={toggle}>{playing?<Pause size={19}/>:<Play size={19}/>}</button>
   <button type="button" aria-label="Avançar 5 segundos" onClick={()=>jump(5)}>+5</button>
   <span>{fmt(current)} / {fmt(duration)}</span>
   <button type="button" aria-label={muted?'Ativar áudio':'Silenciar'} onClick={()=>setMuted(value=>!value)}>{muted?'🔇':'🔊'}</button>
   <button type="button" aria-label="Tela cheia" onClick={toggleFullscreen}>{fullscreen?'⤢':'⛶'}</button>
  </section>

  <section className="fs-mobile-timeline-editor" aria-label="Linha do tempo do vídeo">
   <div className="fs-mobile-timeline-head"><div className="fs-mobile-video-lane-title"><strong>VÍDEO</strong><button type="button" className={muted?'muted':''} onClick={()=>setMuted(value=>!value)}>{muted?'🔇':'🔊'}</button></div><span>{thumbLoading&&!thumbnails.length?'GERANDO QUADROS…':segments.length+' CLIPE'+(segments.length===1?'':'S')+' · '+fmt(editDuration)}</span></div>
   <div ref={filmstripRef} className="fs-mobile-filmstrip">
    {segments.map((segment,index)=>{const frames=clipFrames(segment),width=editDuration?clipDuration(segment)/editDuration*100:100;return <div key={segment.id} className={`fs-mobile-clip ${index===activeSegment?'active':''}`} style={{width:`${width}%`}}
      onPointerDown={e=>{if((e.target as HTMLElement).closest('.fs-trim-handle'))return;e.stopPropagation();dragRef.current={index,startX:e.clientX,moved:false,snap:false};e.currentTarget.setPointerCapture(e.pointerId)}}
      onPointerMove={e=>{const drag=dragRef.current;if(!drag||!e.currentTarget.hasPointerCapture(e.pointerId))return;if(Math.abs(e.clientX-drag.startX)>10){drag.moved=true;if(!drag.snap){snapshot();drag.snap=true}const target=clipIndexAtClientX(e.clientX);if(target!==drag.index){reorderSegment(drag.index,target);drag.index=target}}}}
      onPointerUp={e=>{const drag=dragRef.current;if(!drag)return;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(!drag.moved){const currentIndex=segments.findIndex(s=>s.id===segment.id);const rect=e.currentTarget.getBoundingClientRect(),p=Math.max(0,Math.min(1,(e.clientX-rect.left)/Math.max(1,rect.width)));if(currentIndex>=0)selectSegment(currentIndex,segments[currentIndex].start+p*clipDuration(segments[currentIndex]))}dragRef.current=null}}
      onPointerCancel={()=>{dragRef.current=null}}>
      <div className="fs-mobile-clip-frames">{frames.length?frames.map((src,i)=><img key={i} src={src} alt="" draggable={false}/>):<span>{thumbLoading?'QUADROS…':`CLIP ${index+1}`}</span>}</div>
      <em>CLIP {index+1}</em>
      {index===activeSegment&&<><button type="button" className="fs-trim-handle start" aria-label="Aparar início" onPointerDown={e=>{e.stopPropagation();trimRef.current={index,edge:'start',startX:e.clientX,originalStart:segment.start,originalEnd:segment.end};snapshot();e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{const t=trimRef.current;if(!t||!e.currentTarget.hasPointerCapture(e.pointerId)||!filmstripRef.current)return;const px=Math.max(1,filmstripRef.current.getBoundingClientRect().width),delta=(e.clientX-t.startX)/px*editDuration;trimSegment(t.index,'start',delta,t.originalStart,t.originalEnd)}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);trimRef.current=null}}>‹</button><button type="button" className="fs-trim-handle end" aria-label="Aparar fim" onPointerDown={e=>{e.stopPropagation();trimRef.current={index,edge:'end',startX:e.clientX,originalStart:segment.start,originalEnd:segment.end};snapshot();e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{const t=trimRef.current;if(!t||!e.currentTarget.hasPointerCapture(e.pointerId)||!filmstripRef.current)return;const px=Math.max(1,filmstripRef.current.getBoundingClientRect().width),delta=(e.clientX-t.startX)/px*editDuration;trimSegment(t.index,'end',delta,t.originalStart,t.originalEnd)}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);trimRef.current=null}}>›</button></>}
      {index<segments.length-1&&segment.transition!=='none'&&<small className="fs-transition-badge">◇ {transitionLabel(segment.transition)}</small>}
     </div>})}
    {sliceStart!==null&&<i className="fs-slice-cut-marker start" style={{left:`${editDuration?sliceStart/editDuration*100:0}%`}}/>}
    {sliceEnd!==null&&<i className="fs-slice-cut-marker end" style={{left:`${editDuration?sliceEnd/editDuration*100:0}%`}}/>}
    {sliceStart!==null&&sliceEnd!==null&&<i className="fs-slice-selection" style={{left:`${editDuration?Math.min(sliceStart,sliceEnd)/editDuration*100:0}%`,width:`${editDuration?Math.abs(sliceEnd-sliceStart)/editDuration*100:0}%`}}/>}
    <b className="fs-mobile-filmstrip-playhead" style={{left:`${editDuration?timelineCurrent/editDuration*100:0}%`}}/>
   </div>
   {tracks.length>0&&<div className="fs-mobile-music-section">
    {tracks.map((track,index)=>{const len=musicLength(track),left=editDuration?track.start/editDuration*100:0,width=editDuration?Math.min(len,Math.max(0,editDuration-track.start))/editDuration*100:0;return <div className="fs-mobile-music-track-row" key={track.id}>
     <div className="fs-mobile-music-lane-label"><strong>♫ MÚSICA {index+1}</strong><div><button type="button" className={track.muted?'muted':''} onClick={()=>updateTrack(track.id,{muted:!track.muted})}>{track.muted?'🔇':'🔊'}</button><span>{Math.round(track.volume*100)}%</span></div></div>
     <div className="fs-mobile-music-lane">
      <div className={'fs-mobile-music-clip '+(activeMusicId===track.id?'active ':'')+(track.muted?'muted':'')} style={{left:left+'%',width:Math.max(3,width)+'%'}}
       onPointerDown={e=>{if((e.target as HTMLElement).closest('.fs-music-trim'))return;e.stopPropagation();setActiveMusicId(track.id);musicDragRef.current={id:track.id,startX:e.clientX,originalStart:track.start};e.currentTarget.setPointerCapture(e.pointerId)}}
       onPointerMove={e=>{const d=musicDragRef.current;if(!d||d.id!==track.id||!e.currentTarget.hasPointerCapture(e.pointerId))return;const lane=e.currentTarget.parentElement;if(!lane)return;const px=Math.max(1,lane.getBoundingClientRect().width),delta=(e.clientX-d.startX)/px*editDuration;moveMusic(track.id,d.originalStart+delta)}}
       onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);musicDragRef.current=null}}>
        <span className="fs-music-wave">▮▯▮▮▯▮▯▮▮▯▮▯▮▮▯▮</span><b>♫ {track.file.name}</b>
        {activeMusicId===track.id&&<><button type="button" className="fs-music-trim start" onPointerDown={e=>{e.stopPropagation();musicTrimRef.current={id:track.id,edge:'start',startX:e.clientX,originalStart:track.start,originalIn:track.inPoint,originalOut:track.outPoint};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{const t=musicTrimRef.current;if(!t||t.id!==track.id||!e.currentTarget.hasPointerCapture(e.pointerId))return;const lane=e.currentTarget.parentElement?.parentElement;if(!lane)return;const delta=(e.clientX-t.startX)/Math.max(1,lane.getBoundingClientRect().width)*editDuration;trimMusic(track.id,'start',delta,t.originalStart,t.originalIn,t.originalOut)}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);musicTrimRef.current=null}}>‹</button><button type="button" className="fs-music-trim end" onPointerDown={e=>{e.stopPropagation();musicTrimRef.current={id:track.id,edge:'end',startX:e.clientX,originalStart:track.start,originalIn:track.inPoint,originalOut:track.outPoint};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{const t=musicTrimRef.current;if(!t||t.id!==track.id||!e.currentTarget.hasPointerCapture(e.pointerId))return;const lane=e.currentTarget.parentElement?.parentElement;if(!lane)return;const delta=(e.clientX-t.startX)/Math.max(1,lane.getBoundingClientRect().width)*editDuration;trimMusic(track.id,'end',delta,t.originalStart,t.originalIn,t.originalOut)}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);musicTrimRef.current=null}}>›</button></>}
      </div>
      <i className="fs-mobile-music-playhead" style={{left:(editDuration?timelineCurrent/editDuration*100:0)+'%'}}/>
     </div>
    </div>})}
   </div>}
   <div className="fs-mobile-timeline-actions">
    <button type="button" className={sliceStart!==null&&sliceEnd===null?'armed':''} onClick={markSliceCut}>{sliceStart===null?'✂ 1º CORTE':sliceEnd===null?'✂ 2º CORTE':'↺ NOVO TRECHO'}</button>
    <button type="button" className="danger" onClick={removeSlice} disabled={sliceStart===null||sliceEnd===null}>🗑 APAGAR FATIA</button>
    <button type="button" onClick={sliceStart!==null?clearSlice:undo} disabled={sliceStart===null&&!undoStack.length}>{sliceStart!==null?'×':'↶'}</button>
   </div>
   <small className="fs-mobile-timeline-tip">1º CORTE → mova a agulha → 2º CORTE → APAGAR FATIA. O espaço fecha sozinho e a transição entra no novo encontro.</small>
  </section>

  <section className="fs-mobile-quick">{([['cut','✂','CORTE'],['transition','◇','TRANS.'],['music','♫','MÚSICA'],['text','T','TEXTO'],['format','▣','FORMATO'],['speed','⚡','VELOC.']] as [Tool,string,string][]).map(([value,icon,label])=><button type="button" key={value} className={mobileTool===value?'active':''} onClick={()=>{setTool(value);setMobileTool(currentTool=>currentTool===value?null:value)}}><b>{icon}</b><span>{label}</span></button>)}</section>
  {mobileTool&&<section className="fs-mobile-tool-panel">
   {mobileTool==='cut'&&<div className="fs-mobile-panel-card"><strong>✂ REMOVER UM PEDAÇO</strong><div className="fs-mobile-panel-actions"><button type="button" onClick={markSliceCut}>{sliceStart===null?'1º CORTE':sliceEnd===null?'2º CORTE':'NOVO'}</button><button type="button" className="danger" onClick={removeSlice} disabled={sliceStart===null||sliceEnd===null}>🗑 APAGAR FATIA</button><button type="button" onClick={sliceStart!==null?clearSlice:undo} disabled={sliceStart===null&&!undoStack.length}>{sliceStart!==null?'CANCELAR':'↶ DESFAZER'}</button></div><small>Apaga somente o trecho entre os dois cortes e encosta automaticamente as partes que sobraram.</small></div>}
   {mobileTool==='transition'&&<div className="fs-mobile-panel-card"><strong>◇ TRANSIÇÃO APÓS ESTE CLIPE</strong><div className="fs-mobile-choice-grid">{([['none','SEM'],['fade','SUAVE'],['black','PRETO'],['flash','FLASH']] as [Transition,string][]).map(([value,label])=><button type="button" key={value} className={active?.transition===value?'active':''} onClick={()=>applyTransition(value)}>{label}</button>)}</div></div>}
   {mobileTool==='music'&&<div className="fs-mobile-panel-card"><strong>♫ MÚSICA</strong><button type="button" className="fs-mobile-primary" disabled={tracks.length>=4} onClick={()=>musicInput.current?.click()}>+ ADICIONAR MÚSICA</button>{tracks.map(track=><div className="fs-mobile-music-row" key={track.id} onClick={()=>setActiveMusicId(track.id)}><div><b>{track.file.name}</b><small>{fmt(track.start)} · {fmt(musicLength(track))}</small></div><input aria-label={"Volume "+track.file.name} type="range" min="0" max="1" step=".05" value={track.volume} onChange={e=>updateTrack(track.id,{volume:Number(e.target.value)})}/><button type="button" aria-label="Excluir música" onClick={()=>removeTrack(track.id)}><Trash2 size={15}/></button></div>)}</div>}
   {mobileTool==='text'&&<div className="fs-mobile-panel-card"><strong>T TEXTO</strong><textarea rows={2} value={overlayText} maxLength={120} placeholder="Digite o texto do vídeo…" onChange={e=>setOverlayText(e.target.value)}/></div>}
   {mobileTool==='format'&&<div className="fs-mobile-panel-card"><strong>▣ FORMATO</strong><div className="fs-mobile-choice-grid">{([['vertical','9:16'],['square','1:1'],['wide','16:9'],['original','ORIGINAL']] as [Ratio,string][]).map(([value,label])=><button type="button" key={value} className={ratio===value?'active':''} onClick={()=>setRatio(value)}>{label}</button>)}</div></div>}
   {mobileTool==='speed'&&<div className="fs-mobile-panel-card"><strong>⚡ VELOCIDADE</strong><div className="fs-mobile-choice-grid">{([.5,1,1.5,2] as const).map(value=><button type="button" key={value} className={speed===value?'active':''} onClick={()=>setSpeed(value)}>{value}x</button>)}</div></div>}
  </section>}

  <section className="fs-timeline"><header><div><strong>TIMELINE</strong><button type="button" onClick={smartCut} disabled={detecting}><Sparkles size={13}/>{detecting?'ANALISANDO':'CORTE IA'}</button><button type="button" onClick={splitHere}><Scissors size={13}/>DIVIDIR</button><button type="button" onClick={deleteActive} disabled={!active||segments.length<=1}><Trash2 size={13}/>EXCLUIR</button><button type="button" onClick={undo} disabled={!undoStack.length}><RotateCcw size={14}/></button></div><span>{fmt(totalKept)}</span></header><div className="fs-timeline-scroll"><div className="fs-ruler">{Array.from({length:7},(_,i)=><span key={i}>{fmt(duration*i/6)}</span>)}</div><div className="fs-lane"><b>VÍDEO</b><div className="fs-lane-track">{segments.map((segment,index)=><button type="button" key={segment.id} className={`fs-video-clip ${index===activeSegment?'selected':''} ${segment.keep?'':'removed'}`} style={{left:`${duration?segment.start/duration*100:0}%`,width:`${duration?(segment.end-segment.start)/duration*100:0}%`}} onClick={()=>selectSegment(index)} onDoubleClick={()=>toggleKeep(index)}><span>CLIP {String(index+1).padStart(2,'0')} · {fmt(segment.start)}–{fmt(segment.end)}</span></button>)}<i className="fs-playhead" style={{left:`${duration?current/duration*100:0}%`}}/></div></div>{tracks.slice(0,2).map((track,index)=><div className="fs-lane" key={track.id}><b>ÁUDIO {index+1}</b><div className="fs-lane-track"><div className="fs-audio-clip" style={{left:`${editDuration?track.start/editDuration*100:0}%`,width:`${editDuration?Math.min(musicLength(track),Math.max(0,editDuration-track.start))/editDuration*100:0}%`}}>♫ {track.file.name}</div></div></div>)}<div className="fs-lane"><b>CC LEGENDAS</b><div className="fs-lane-track">{captions.map(c=><div className="fs-caption-clip" key={c.id} style={{left:`${duration?c.start/duration*100:0}%`,width:`${duration?(c.end-c.start)/duration*100:0}%`}}>{c.text}</div>)}</div></div></div><small>Clipes divididos sem perder o original · EXCLUIR retira o clipe do vídeo final · duplo clique também remove/recoloca</small></section>

  {error&&<div className="fs-studio-error" role="alert">{error}</div>}{exporting&&<div className="fs-export-progress" role="status"><div style={{width:`${progress}%`}}/><span>GERANDO VÍDEO · {Math.round(progress)}%</span></div>}
  <footer className="fs-mobile-bottom"><button type="button" onClick={()=>exportVideo(true)} disabled={exporting||!duration}>SEM EDIÇÃO</button><button type="button" onClick={()=>exportVideo(false)} disabled={exporting||!duration}><Check size={14}/>{exporting?'GERANDO…':'GERAR VÍDEO'}</button></footer>
 </section></div>
}
