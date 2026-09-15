'use client'

import { useRef, useState, useEffect } from 'react'
import { Camera, Save, Upload } from 'lucide-react'

export default function ProfileEditor({ profile, email }:{ profile:any; email?:string|null }) {
  const [avatar,setAvatar]=useState(profile?.avatar_url || '')
  const [banner,setBanner]=useState(profile?.banner_url||'')
  const [color,setColor]=useState(profile?.profile_color||'#ff2546')
  const [removeBanner,setRemoveBanner]=useState(false)
  useEffect(()=>()=>{if(banner.startsWith('blob:'))URL.revokeObjectURL(banner)},[banner])
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
    if(busy)return
    const submitted=new FormData(e.currentTarget)
    const total=['avatar','banner'].reduce((n,key)=>{const f=submitted.get(key);return n+(f instanceof File?f.size:0)},0)
    if(total>4*1024*1024){setMsg('Envie até 4 MB no total. Salve a foto e a capa separadamente se necessário.');return}
    setBusy(true)
    setMsg('')

    const form=new FormData(e.currentTarget)
    form.set('current_avatar',profile?.avatar_url||'')

    try{
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
    }catch{setMsg('Falha de conexão. Tente salvar novamente.')}finally{setBusy(false)}
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
      <div className="profile-customization">
        <label>Capa do perfil (opcional)<input type="file" name="banner" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>3*1024*1024||!['image/jpeg','image/png','image/webp'].includes(f.type)){setMsg('Use JPG, PNG ou WebP de até 3 MB.');e.target.value='';return}setBanner(URL.createObjectURL(f));setRemoveBanner(false)}}/></label>
        <small>Imagem horizontal · recomendado 1600 × 500 · até 3 MB</small>
        <div style={{height:120,borderRadius:12,marginTop:12,overflow:'hidden',background:`linear-gradient(120deg,#141418,${color})`,borderBottom:`3px solid ${color}`}}>{banner&&!removeBanner&&<img src={banner} alt="Prévia da capa" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div>
        {profile?.banner_url&&<label><span><input type="checkbox" name="remove_banner" checked={removeBanner} onChange={e=>setRemoveBanner(e.target.checked)}/> Usar capa padrão</span></label>}
        <label>Cor de destaque<input type="color" name="profile_color" value={color} onChange={e=>setColor(e.target.value)} style={{width:64,height:44,padding:4}}/></label>
      </div>
      <label>Biografia (opcional)<textarea className="field" name="bio" rows={4} defaultValue={profile?.bio||''} placeholder="Conte um pouco sobre sua garagem, projetos e estilo automotivo."/></label>
      <button className="btn btn-red fs-hero-action" disabled={busy}>
        <Save size={16}/>{busy?' SALVANDO...':' SALVAR PERFIL'}
      </button>
      {msg?<div className="form-message">{msg}</div>:null}
    </div>
  </form>
}
