'use client'
import {useEffect,useRef,useState} from 'react'
import {useRouter} from 'next/navigation'
import VerifiedBadge from './VerifiedBadge'
function paymentUrl(value:unknown){try{const u=new URL(String(value));return u.protocol==='https:'&&(u.hostname==='mercadopago.com.br'||u.hostname.endsWith('.mercadopago.com.br'))?u.href:null}catch{return null}}
export default function VerifiedPurchase({active,blocked}:{active:boolean;blocked:boolean}){
 const [data,setData]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const lock=useRef(false)
 const router=useRouter()
 async function check(create=false){
  if(lock.current)return
  lock.current=true;setBusy(true);setError('')
  // Abrir durante o clique evita o bloqueio normal de pop-ups após o fetch.
  const popup=create?window.open('about:blank','_blank','popup,width=520,height=760'):null
  if(popup){popup.opener=null;popup.document.title='Pagamento FULLSEND';popup.document.body.textContent='Preparando seu pagamento no Mercado Pago…'}
  try{
   const r=await fetch('/api/payments/verified',{method:create?'POST':'GET',cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error)
   const ticket=paymentUrl(d.ticket_url);setData({...d,ticket_url:ticket})
   if(d.active){popup?.close();router.refresh()}
   else if(create){if(ticket){if(popup&&!popup.closed)popup.location.replace(ticket)}else{popup?.close();setError(d.status==='pending'?'O link ainda não está disponível. Tente abrir o pagamento novamente.':'Este pagamento foi encerrado. Clique novamente para gerar outro.')}}
  }catch(e){popup?.close();setError(e instanceof Error?e.message:'Falha ao consultar pagamento.')}
  finally{lock.current=false;setBusy(false)}
 }
 useEffect(()=>{if(data?.status!=='pending'||active||data?.active)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')check()},6000);const focus=()=>check();window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus)}},[data?.status,data?.active,active])
 return <section className="user-profile-card" style={{padding:22,marginTop:18}}><h3 style={{display:'flex',alignItems:'center',gap:8}}><VerifiedBadge active/> Selo Verificado</h3><p>{active||data?.active?'Seu selo está ativo.':blocked?'Selo indisponível. Contate a administração.':'R$ 7,99 · pagamento único via Pix no Mercado Pago.'}</p><small>Benefício visual do FULLSEND. Não representa verificação de documentos ou garantia de negociações.</small>
 {!active&&!data?.active&&!blocked&&<div style={{marginTop:14,display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}><button className="btn btn-red" disabled={busy} onClick={()=>check(true)}>{busy?'Aguarde…':data?.status==='pending'?'Abrir pagamento ↗':'Adquirir selo — R$ 7,99 ↗'}</button>
 {data?.status==='pending'&&<><button className="btn" disabled={busy} onClick={()=>check()}>Já paguei · verificar</button><p role="status" style={{width:'100%',margin:0}}>Aguardando confirmação. O selo será ativado automaticamente.</p>{data.ticket_url&&<a href={data.ticket_url} target="_blank" rel="noopener noreferrer">Se a janela não abriu, toque aqui para pagar ↗</a>}</>}
 </div>}{error&&<p role="alert">{error}</p>}</section>
}
