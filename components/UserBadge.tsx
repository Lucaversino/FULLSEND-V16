import Image from 'next/image'
import './badge-art.css'

export default function UserBadge({ badge, compact=false }:{ badge?:string|null; compact?:boolean }) {
  if (String(badge||'').toLowerCase() !== 'admin') return null
  return <span className={`user-badge user-badge-admin ${compact?'compact':''}`} title="Administrador FULLSEND"><Image src="/badges/admin.png" width={compact?36:64} height={compact?36:64} alt="Selo de administrador"/></span>
}
