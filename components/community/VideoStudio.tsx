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
