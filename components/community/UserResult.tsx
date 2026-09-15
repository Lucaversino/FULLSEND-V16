'use client'
import { useState } from 'react'
import Link from 'next/link'
import { safeImage } from '@/lib/community/shared'
import VerifiedAvatarBadge from '@/components/VerifiedAvatarBadge'
export type CommunityPerson={id:string;name:string|null;avatar_url?:string|null;city?:string|null;state?:string|null;is_verified?:boolean}
function Avatar({person}:{person:CommunityPerson}){
 const [failed,setFailed]=useState(false)
 const src=safeImage(person.avatar_url)
 return <span className="cm-avatar">{src&&!failed?<img src={src} alt="" loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:<span aria-hidden="true">{(person.name?.trim()||'F').slice(0,1).toUpperCase()}</span>}</span>
}
export default function UserResult({person}:{person:CommunityPerson}){
 return <Link className="cm-person-result" href={`/comunidade/usuario/${person.id}`}><span className="verified-avatar-wrap"><Avatar key={person.avatar_url||person.id} person={person}/><VerifiedAvatarBadge active={person.is_verified}/></span><span className="cm-person-copy"><strong>{person.name?.trim()||'Membro FULLSEND'}</strong><small>{[person.city,person.state].filter(Boolean).join(' / ')||'Membro da comunidade'}</small></span></Link>
}
