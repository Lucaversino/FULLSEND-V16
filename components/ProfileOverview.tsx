'use client'

import { useState } from 'react'
import { Edit3, MapPin, MessageCircle, Instagram, Mail, X } from 'lucide-react'
import ProfileEditor from '@/components/ProfileEditor'
import UserBadge from '@/components/UserBadge'
import ReputationBadge from '@/components/ReputationBadge'

export default function ProfileOverview({profile,email,isVip:_isVip}:{profile:any;email?:string|null;isVip:boolean}){
  const [editing,setEditing]=useState(false)
  return <section className="user-profile-card">
    <div className="user-profile-main">
      <div className="user-avatar-wrap">
        <div className="user-avatar">
          {profile?.avatar_url?<img src={profile.avatar_url} alt="Foto de perfil"/>:<span>{String(profile?.name||'F').slice(0,1).toUpperCase()}</span>}
        </div>
      </div>
      <div className="user-profile-copy">
        <span className="user-overline">PERFIL FULLSEND</span>
        <div className="profile-name-with-badge"><h2>{profile?.name||'Membro FULLSEND'}</h2><UserBadge badge={profile?.badge}/><ReputationBadge level={profile?.reputation_level||'ROOKIE'} xp={profile?.xp_points}/></div>
        <p>{profile?.bio||'Sua garagem, seus projetos e sua identidade automotiva.'}</p>
      </div>
      <button className="user-edit-profile-btn" onClick={()=>setEditing(true)}><Edit3 size={15}/> EDITAR PERFIL</button>
    </div>

    <div className="user-profile-info">
      <div><Mail size={13}/><span><small>E-MAIL</small><b>{email||'—'}</b></span></div>
      <div><MapPin size={13}/><span><small>LOCALIZAÇÃO</small><b>{profile?.city?`${profile.city}${profile?.state?` / ${profile.state}`:''}`:'Não informada'}</b></span></div>
      <div><MessageCircle size={13}/><span><small>WHATSAPP</small><b>{profile?.whatsapp||'Não informado'}</b></span></div>
      <div><Instagram size={13}/><span><small>INSTAGRAM</small><b>{profile?.instagram||'Não informado'}</b></span></div>
    </div>

    {editing?<div className="profile-edit-overlay">
      <div className="profile-edit-panel">
        <div className="profile-edit-panel-head"><div><span>CONFIGURAÇÕES</span><h3>EDITAR PERFIL</h3></div><button onClick={()=>setEditing(false)}><X size={19}/></button></div>
        <ProfileEditor profile={profile} email={email}/>
      </div>
    </div>:null}
  </section>
}
