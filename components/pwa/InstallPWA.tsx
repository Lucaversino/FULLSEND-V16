'use client'
import { useEffect, useState } from 'react'
import { Download, Share2, X } from 'lucide-react'
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome:'accepted'|'dismissed' }> }
const KEY='fullsend-pwa-dismissed-at'
export default function InstallPWA(){
  const [promptEvent,setPromptEvent]=useState<BeforeInstallPromptEvent|null>(null);const [showIOS,setShowIOS]=useState(false);const [ready,setReady]=useState(false)
  useEffect(()=>{const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as any).standalone===true;if(standalone)return;const last=Number(localStorage.getItem(KEY)||0);if(last&&Date.now()-last<7*24*60*60*1000)return;const ua=navigator.userAgent.toLowerCase();const ios=/iphone|ipad|ipod/.test(ua);const timer=window.setTimeout(()=>{if(ios)setShowIOS(true);setReady(true)},12000);const handler=(e:Event)=>{e.preventDefault();setPromptEvent(e as BeforeInstallPromptEvent)};window.addEventListener('beforeinstallprompt',handler);return()=>{clearTimeout(timer);window.removeEventListener('beforeinstallprompt',handler)}},[])
  function close(){localStorage.setItem(KEY,String(Date.now()));setReady(false);setShowIOS(false);setPromptEvent(null)}
  if(!ready||(!promptEvent&&!showIOS))return null
  return <div className="pwa-install"><button className="pwa-close" onClick={close} aria-label="Fechar"><X size={18}/></button><div className="pwa-badge">FULLSEND APP</div><strong>Instale o FULLSEND</strong>{promptEvent?<><span>Acesse mais rápido pela tela inicial do celular.</span><button className="btn btn-red" onClick={async()=>{await promptEvent.prompt();await promptEvent.userChoice;close()}}><Download size={17}/> INSTALAR</button></>:<><span>No iPhone: use o Safari, toque em Compartilhar e escolha Adicionar à Tela de Início.</span><div className="ios-hint"><Share2 size={18}/> Safari → Compartilhar → Adicionar à Tela de Início</div></>}</div>
}
