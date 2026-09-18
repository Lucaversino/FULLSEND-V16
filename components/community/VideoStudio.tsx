'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, Image as ImageIcon, Pause, Play, RotateCcw, Save, Scissors, Sparkles, Trash2, Volume2, X } from 'lucide-react'
import './video-studio.css'

type Ratio='vertical'|'square'|'wide'|'original'
type Quality='1080'|'720'|'auto'
type Segment={id:string;start:number;end:number;keep:boolean}
type MusicTrack={id:string;file:File;url:string;start:number;volume:number;duration:number}
type Caption={id:string;start:number;end:number;text:string}
type Tool='cut'|'music'|'captions'|'format'|'speed'|'text'|'cover'

const uid=()=>crypto.randomUUID()
const fmt=(value:number)=>{const safe=Math.max(0,Number.isFinite(value)?value:0),h=Math.floor(safe/3600),m=Math.floor((safe%3600)/60),s=Math.floor(safe%60),d=Math.floor((safe%1)*10);return h?`${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`:`${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}.${d}`}
const wait=(media:HTMLMediaElement,event:string)=>new Promise<void>((resolve,reject)=>{const done=()=>{clean();resolve()},fail=()=>{clean();reject(new Error('Não foi possível ler esta mídia.'))},clean=()=>{media.removeEventListener(event,done);media.removeEventListener('error',fail)};media.addEventListener(event,done,{once:true});media.addEventListener('error',fail,{once:true})})
function recorderType(){if(typeof MediaRecorder==='undefined')return '';return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))||''}

export default function VideoStudio({file,onCancel,onConfirm}:{file:File;onCancel:()=>void;onConfirm:(file:File)=>void}){
 const sourceUrl=useMemo(()=>URL.createObjectURL(file),[file])
 const videoRef=useRef<HTMLVideoElement>(null),musicInput=useRef<HTMLInputElement>(null),tracksRef=useRef<MusicTrack[]>([])
 const [duration,setDuration]=useState(0),[current,setCurrent]=useState(0),[playing,setPlaying]=useState(false)
 const [ratio,setRatio]=useState<Ratio>('vertical'),[quality,setQuality]=useState<Quality>('1080'),[speed,setSpeed]=useState<.5|1|1.5|2>(1),[volume,setVolume]=useState(.76),[tool,setTool]=useState<Tool>('cut')
 const [segments,setSegments]=useState<Segment[]>([]),[activeSegment,setActiveSegment]=useState(0),[undoStack,setUndoStack]=useState<Segment[][]>([])
 const [tracks,setTracks]=useState<MusicTrack[]>([]),[captions,setCaptions]=useState<Caption[]>([]),[overlayText,setOverlayText]=useState(''),[coverTime,setCoverTime]=useState(0)
 const [captionStatus,setCaptionStatus]=useState<'idle'|'working'|'ready'|'error'>('idle'),[captionMessage,setCaptionMessage]=useState('Toque para gerar legendas automáticas no navegador.')
 const [detecting,setDetecting]=useState(false),[exporting,setExporting]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState('')
 const active=segments[activeSegment]
 useEffect(()=>{tracksRef.current=tracks},[tracks])
 useEffect(()=>()=>{URL.revokeObjectURL(sourceUrl);tracksRef.current.forEach(t=>URL.revokeObjectURL(t.url))},[sourceUrl])
 useEffect(()=>{const v=videoRef.current;if(v){v.playbackRate=speed;v.volume=volume}},[speed,volume])

 function snapshot(){setUndoStack(stack=>[...stack.slice(-9),segments.map(s=>({...s}))])}
 function undo(){const prev=undoStack.at(-1);if(!prev)return;setSegments(prev);setUndoStack(stack=>stack.slice(0,-1));setActiveSegment(Math.min(activeSegment,Math.max(0,prev.length-1)))}
 function seek(value:number){const next=Math.max(0,Math.min(duration||0,value));setCurrent(next);const v=videoRef.current;if(v&&Math.abs(v.currentTime-next)>.04)v.currentTime=next}
 async function toggle(){const v=videoRef.current;if(!v)return;if(v.paused){v.playbackRate=speed;v.volume=volume;await v.play().catch(()=>setError('O navegador bloqueou a reprodução. Toque novamente.'))}else v.pause()}
 function selectSegment(index:number){setActiveSegment(index);const seg=segments[index];if(seg)seek(seg.start)}
 function patchActive(patch:Partial<Segment>){if(!active)return;snapshot();setSegments(items=>items.map((s,i)=>i===activeSegment?{...s,...patch}:s))}
 function splitHere(){if(!active||current<=active.start+.15||current>=active.end-.15)return;snapshot();setSegments(items=>{const next=[...items];next.splice(activeSegment,1,{...active,id:uid(),end:current},{...active,id:uid(),start:current});return next});setActiveSegment(activeSegment+1)}
 function toggleKeep(index:number){snapshot();setSegments(items=>items.map((s,i)=>i===index?{...s,keep:!s.keep}:s))}

 async function smartCut(){
  const source=videoRef.current;if(!source||!duration||detecting)return;setDetecting(true);setError('');const old=source.currentTime,wasPlaying=!source.paused;source.pause()
  try{
   const canvas=document.createElement('canvas');canvas.width=96;canvas.height=54;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Seu navegador não conseguiu iniciar a análise de cenas.')
   const step=Math.max(2,Math.min(8,duration/70)),marks:number[]=[];let previous:Uint8ClampedArray|null=null
   for(let t=0;t<duration;t+=step){source.currentTime=Math.min(duration-.05,t);await wait(source,'seeked').catch(()=>{});ctx.drawImage(source,0,0,canvas.width,canvas.height);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;if(previous){let diff=0;for(let i=0;i<data.length;i+=16)diff+=Math.abs(data[i]-previous[i])+Math.abs(data[i+1]-previous[i+1])+Math.abs(data[i+2]-previous[i+2]);const normalized=diff/(data.length/16*765);if(normalized>.19)marks.push(t)}previous=new Uint8ClampedArray(data)}
   const minGap=Math.max(8,Math.min(25,duration/14)),filtered=marks.filter((time,index)=>index===0||time-marks[index-1]>minGap),bounds=[0,...filtered,duration].sort((a,b)=>a-b);let detected:Segment[]=[]
   for(let i=0;i<bounds.length-1;i++)if(bounds[i+1]-bounds[i]>.7)detected.push({id:uid(),start:bounds[i],end:bounds[i+1],keep:true})
   if(detected.length<2){const count=Math.min(5,Math.max(2,Math.ceil(duration/75))),size=duration/count;detected=Array.from({length:count},(_,i)=>({id:uid(),start:i*size,end:i===count-1?duration:(i+1)*size,keep:true}))}
   snapshot();setSegments(detected);setActiveSegment(0);seek(detected[0]?.start||0)
  }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível analisar as cenas.')}finally{source.currentTime=old;if(wasPlaying)source.play().catch(()=>{});setDetecting(false)}
 }

 function addMusic(files:FileList|null){const picked=Array.from(files||[]).slice(0,Math.max(0,4-tracks.length));for(const f of picked){if(!f.type.startsWith('audio/')){setError('Escolha somente arquivos de áudio.');continue}if(f.size>25*1024*1024){setError('Cada música pode ter no máximo 25 MB.');continue}const url=URL.createObjectURL(f),audio=new Audio(url);audio.preload='metadata';audio.onloadedmetadata=()=>setTracks(items=>items.length>=4?items:[...items,{id:uid(),file:f,url,start:current,volume:.8,duration:Number.isFinite(audio.duration)?audio.duration:0}]);audio.onerror=()=>{URL.revokeObjectURL(url);setError(`Não foi possível abrir ${f.name}.`)}}}
 function updateTrack(id:string,patch:Partial<MusicTrack>){setTracks(items=>items.map(t=>t.id===id?{...t,...patch}:t))}
 function removeTrack(id:string){setTracks(items=>{const found=items.find(t=>t.id===id);if(found)URL.revokeObjectURL(found.url);return items.filter(t=>t.id!==id)})}

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

