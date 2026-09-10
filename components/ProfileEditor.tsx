'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Save } from 'lucide-react'

export default function ProfileEditor({ profile, email }:{ profile:any; email?:string|null }) {
  const [avatar,setAvatar]=useState(profile?.avatar_url || '')
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setMsg('')
    const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser()
    if(!user){setBusy(false);setMsg('Sessão expirada.');return}
    const fd=new FormData(e.currentTarget)
    let avatarUrl=avatar
    const file=fd.get('avatar')
    if(file instanceof File && file.size>0){
      if(file.size>5*1024*1024){setBusy(false);setMsg('A foto deve ter no máximo 5 MB.');return}
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase()
      const path=`${user.id}/avatar-${Date.now()}.${ext}`
      const {error:upErr}=await supabase.storage.from('profile-avatars').upload(path,file,{upsert:false})
      if(upErr){setBusy(false);setMsg(upErr.message);return}
      avatarUrl=supabase.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl
      setAvatar(avatarUrl)
    }
    const payload={
      name:String(fd.get('name')||'').trim(),
      city:String(fd.get('city')||'').trim(),
      state:String(fd.get('state')||'').trim().toUpperCase(),
      whatsapp:String(fd.get('whatsapp')||'').trim(),
      bio:String(fd.get('bio')||'').trim(),
      instagram:String(fd.get('instagram')||'').trim(),
      avatar_url:avatarUrl||null,
      updated_at:new Date().toISOString(),
    }
    const {error}=await supabase.from('profiles').update(payload).eq('id',user.id)
    setBusy(false); setMsg(error?error.message:'Perfil atualizado com sucesso.')
  }

  return <form className="profile-editor" onSubmit={submit}>
    <div className="avatar-editor">
      <div className="profile-avatar-large">{avatar?<img src={avatar} alt="Foto de perfil"/>:<span>{String(profile?.name||'F').slice(0,1).toUpperCase()}</span>}</div>
      <label className="avatar-upload"><Camera size={16}/> TROCAR FOTO<input type="file" name="avatar" accept="image/jpeg,image/png,image/webp"/></label>
      <small>JPG, PNG ou WEBP • máximo 5 MB</small>
    </div>
    <div className="profile-editor-fields">
      <label>E-mail<input className="field" value={email||''} disabled/></label>
      <label>Nome<input className="field" name="name" defaultValue={profile?.name||''} required/></label>
      <div className="two-col"><label>Cidade<input className="field" name="city" defaultValue={profile?.city||''}/></label><label>UF<input className="field" name="state" maxLength={2} defaultValue={profile?.state||''}/></label></div>
      <label>WhatsApp<input className="field" name="whatsapp" defaultValue={profile?.whatsapp||''}/></label>
      <label>Instagram<input className="field" name="instagram" defaultValue={profile?.instagram||''} placeholder="@seuinstagram"/></label>
      <label>Bio<textarea className="field" name="bio" rows={4} defaultValue={profile?.bio||''} placeholder="Conte um pouco sobre sua garagem, projetos e estilo automotivo."/></label>
      <button className="btn btn-red fs-hero-action" disabled={busy}><Save size={16}/>{busy?' SALVANDO...':' SALVAR PERFIL'}</button>
      {msg?<div className="form-message">{msg}</div>:null}
    </div>
  </form>
}
