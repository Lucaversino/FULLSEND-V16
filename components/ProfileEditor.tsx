'use client'

import { useRef, useState } from 'react'
import { Camera, Save, Upload } from 'lucide-react'

export default function ProfileEditor({ profile, email }:{ profile:any; email?:string|null }) {
  const [avatar,setAvatar]=useState(profile?.avatar_url || '')
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')
  const [selectedName,setSelectedName]=useState('')
  const fileRef=useRef<HTMLInputElement|null>(null)

  function chooseAvatar(file?:File){
    if(!file)return
    if(file.size>5*1024*1024){
      setMsg('A foto deve ter no máximo 5 MB.')
      if(fileRef.current)fileRef.current.value=''
      return
    }
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
      setMsg('Formato inválido. Use JPG, PNG ou WEBP.')
      if(fileRef.current)fileRef.current.value=''
      return
    }
    setMsg('')
    setSelectedName(file.name)
    setAvatar(URL.createObjectURL(file))
  }

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    setBusy(true)
    setMsg('')

    const form=new FormData(e.currentTarget)
    form.set('current_avatar',profile?.avatar_url||'')

    const response=await fetch('/api/profile/update',{
      method:'POST',
      body:form,
    })
    const result=await response.json().catch(()=>({}))

    setBusy(false)

    if(!response.ok){
      setMsg(result.error||'Não foi possível atualizar o perfil.')
      return
    }

    if(result?.profile?.avatar_url)setAvatar(result.profile.avatar_url)
    setSelectedName('')
    setMsg('Perfil atualizado com sucesso.')

    // Atualiza a página para refletir a nova foto em todo o painel.
    setTimeout(()=>window.location.reload(),450)
  }

  return <form className="profile-editor" onSubmit={submit}>
    <div className="avatar-editor">
      <div className="profile-avatar-large">
        {avatar?<img src={avatar} alt="Foto de perfil"/>:<span>{String(profile?.name||'F').slice(0,1).toUpperCase()}</span>}
      </div>

      <input
        ref={fileRef}
        id="fullsend-profile-avatar"
        className="avatar-file-input"
        type="file"
        name="avatar"
        accept="image/jpeg,image/png,image/webp"
        onChange={e=>chooseAvatar(e.target.files?.[0])}
      />

      <label htmlFor="fullsend-profile-avatar" className="avatar-upload">
        <Camera size={16}/> TROCAR FOTO
      </label>

      {selectedName?<span className="avatar-selected-file"><Upload size={13}/>{selectedName}</span>:null}
      <small>JPG, PNG ou WEBP • máximo 5 MB • funciona também para contas Google</small>
    </div>

    <div className="profile-editor-fields">
      <label>E-mail<input className="field" value={email||''} disabled/></label>
      <label>Nome<input className="field" name="name" defaultValue={profile?.name||''} required/></label>
      <div className="two-col">
        <label>Cidade<input className="field" name="city" defaultValue={profile?.city||''}/></label>
        <label>UF<input className="field" name="state" maxLength={2} defaultValue={profile?.state||''}/></label>
      </div>
      <label>WhatsApp<input className="field" name="whatsapp" defaultValue={profile?.whatsapp||''}/></label>
      <label>Instagram<input className="field" name="instagram" defaultValue={profile?.instagram||''} placeholder="@seuinstagram"/></label>
      <label>Bio<textarea className="field" name="bio" rows={4} defaultValue={profile?.bio||''} placeholder="Conte um pouco sobre sua garagem, projetos e estilo automotivo."/></label>
      <button className="btn btn-red fs-hero-action" disabled={busy}>
        <Save size={16}/>{busy?' SALVANDO...':' SALVAR PERFIL'}
      </button>
      {msg?<div className="form-message">{msg}</div>:null}
    </div>
  </form>
}
