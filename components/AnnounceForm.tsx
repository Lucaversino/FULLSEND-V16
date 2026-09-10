'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UploadCloud, ShieldCheck } from 'lucide-react'

export default function AnnounceForm({defaults}:{defaults?:{city?:string;state?:string;whatsapp?:string}}){
  const [msg,setMsg]=useState(''); const [busy,setBusy]=useState(false); const router=useRouter()
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setMsg('Validando conta...'); const form=e.currentTarget; const fd=new FormData(form); const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user){router.push('/login?next=/anunciar');return}
    const files=fd.getAll('media').filter(x=>x instanceof File && x.size>0) as File[]; const media:string[]=[]
    for(const f of files.slice(0,15)){if(f.size>20*1024*1024){continue}const path=`${user.id}/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const {error}=await supabase.storage.from('listing-media').upload(path,f,{upsert:false});if(!error){const {data}=supabase.storage.from('listing-media').getPublicUrl(path);media.push(data.publicUrl)}}
    const title=String(fd.get('title')||'').trim();const slug=`${title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${Date.now().toString().slice(-7)}`
    const payload={user_id:user.id,title,slug,description:String(fd.get('description')||'').trim(),price:Number(fd.get('price')||0),category_slug:String(fd.get('category_slug')),city:String(fd.get('city')||'').trim(),state:String(fd.get('state')||'').trim().toUpperCase(),whatsapp:String(fd.get('whatsapp')||'').trim(),cover_url:media[0]||null,media,tags:String(fd.get('tags')||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean).slice(0,8),source:'fullsend',status:'active'}
    const {error}=await supabase.from('listings').insert(payload); setBusy(false); if(error){setMsg(error.message);return} setMsg('Anúncio publicado com sucesso.'); form.reset(); router.push('/perfil'); router.refresh()
  }
  return <form onSubmit={submit} className="announce-form">
    <div className="form-section"><div className="form-section-title"><span>01</span><div><h3>TIPO DE ANÚNCIO</h3><p>Escolha onde seu anúncio se encaixa.</p></div></div><select name="category_slug" className="field" required><option value="">Selecione uma categoria</option><option value="carros">Carros</option><option value="motores">Motores & Turbo</option><option value="rodas">Rodas & Pneus</option><option value="suspensao">Suspensão</option><option value="som">Som Automotivo</option><option value="acessorios">Acessórios</option></select></div>
    <div className="form-section"><div className="form-section-title"><span>02</span><div><h3>INFORMAÇÕES</h3><p>Seja objetivo e descreva o setup.</p></div></div><input className="field" name="title" placeholder="Ex.: Golf GTI Stage 3 430cv" required maxLength={120}/><textarea className="field" name="description" placeholder="Motor, preparação, suspensão, rodas, documentação, estado do veículo..." rows={7} required/><input className="field" name="tags" placeholder="Tags separadas por vírgula: TURBO, FUELTECH, FORJADO"/></div>
    <div className="form-section"><div className="form-section-title"><span>03</span><div><h3>PREÇO E CONTATO</h3><p>O WhatsApp será usado para contato direto.</p></div></div><div className="two-col"><input className="field" name="price" type="number" min="0" step="0.01" placeholder="Preço" required/><input className="field" name="whatsapp" defaultValue={defaults?.whatsapp} placeholder="WhatsApp com DDD" required/></div><div className="two-col city-col"><input className="field" name="city" defaultValue={defaults?.city} placeholder="Cidade" required/><input className="field" name="state" defaultValue={defaults?.state} placeholder="UF" maxLength={2} required/></div></div>
    <div className="form-section"><div className="form-section-title"><span>04</span><div><h3>FOTOS E VÍDEOS</h3><p>Até 15 arquivos, máximo 20 MB por arquivo.</p></div></div><label className="upload-box"><UploadCloud size={34}/><strong>SELECIONAR MÍDIA</strong><span>JPG, PNG, WEBP, GIF, MP4 ou WEBM</span><input name="media" type="file" accept="image/*,video/*" multiple/></label></div>
    <div className="publish-row"><span><ShieldCheck size={18}/> Publicação vinculada à sua conta.</span><button className="btn btn-red fs-hero-action" disabled={busy}>{busy?'PUBLICANDO...':'PUBLICAR ANÚNCIO'}</button></div>{msg?<div className="form-message">{msg}</div>:null}
  </form>
}
