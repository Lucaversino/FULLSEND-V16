'use client'
import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import VerifiedBadge from './VerifiedBadge'
export default function VerifiedPurchase({active,blocked}:{active:boolean;blocked:boolean}){
 const [data,setData]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const router=useRouter()
 async function check(create=false){setBusy(true);setError('');try{const r=await fetch('/api/payments/verified',{method:create?'POST':'GET',cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);if(d.active)router.refresh()}catch(e){setError(e instanceof Error?e.message:'Falha ao consultar Pix.')}finally{setBusy(false)}}
 useEffect(()=>{if(!data||data.status!=='pending'||active)return;const timer=setTimeout(()=>check(),6000);return()=>clearTimeout(timer)},[data,active])
 return <section className="user-profile-card" style={{padding:22,marginTop:18}}><h3 style={{display:'flex',alignItems:'center',gap:8}}><VerifiedBadge active/> Selo Verificado</h3><p>{active||data?.active?'Seu selo está ativo.':blocked?'Selo indisponível. Contate a administração.':'R$ 7,99 · pagamento único. Ativação após a confirmação do Pix.'}</p><small>Benefício visual do FULLSEND. Não representa verificação de documentos ou garantia de negociações.</small>
 {!active&&!data?.active&&!blocked&&<div style={{marginTop:14}}><button className="btn btn-red" disabled={busy} onClick={()=>check(true)}>{busy?'Aguarde…':data?.qr_code?'Consultar pagamento':'Adquirir selo — R$ 7,99'}</button>
 {data?.status==='pending'&&data.qr_code&&<div style={{maxWidth:340,marginTop:18}}>{data.qr_code_base64&&<img src={`data:image/png;base64,${data.qr_code_base64}`} alt="QR Code Pix do selo" width={220} height={220}/>}<p>Aguardando confirmação do pagamento.</p><textarea aria-label="Pix copia e cola" readOnly value={data.qr_code} style={{width:'100%',minHeight:80}}/><button className="btn" onClick={async()=>{try{await navigator.clipboard.writeText(data.qr_code)}catch{setError('Selecione e copie o código acima.')}}}>Copiar Pix</button></div>}
 {data?.status&&data.status!=='pending'&&!data.active&&<p>Pagamento: {data.status}. Você pode tentar novamente.</p>}</div>}{error&&<p role="alert">{error}</p>}</section>
}
