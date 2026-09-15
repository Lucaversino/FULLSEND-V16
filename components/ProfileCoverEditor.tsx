'use client'
import {useRef,useState} from 'react'
import {Camera} from 'lucide-react'
import {useRouter} from 'next/navigation'
export default function ProfileCoverEditor(){const input=useRef<HTMLInputElement>(null),[busy,setBusy]=useState(false),router=useRouter();async function change(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;setBusy(true);try{const fd=new FormData();fd.set('cover',f);const r=await fetch('/api/profile/cover',{method:'POST',body:fd});const d=await r.json();if(!r.ok)throw new Error(d.error||'Falha ao enviar capa.');router.refresh()}catch(e){alert(e instanceof Error?e.message:'Falha ao enviar capa.')}finally{setBusy(false);e.target.value=''}}return <><button className="cm-cover-edit" type="button" disabled={busy} onClick={()=>input.current?.click()}><Camera size={15}/>{busy?' ENVIANDO...':' EDITAR CAPA'}</button><input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={change}/></>}
