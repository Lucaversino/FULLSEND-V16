import { ShieldCheck } from 'lucide-react'

export default function UserBadge({ badge, compact=false }:{ badge?:string|null; compact?:boolean }) {
  if (String(badge||'').toLowerCase() !== 'admin') return null
  return <span className={`user-badge user-badge-admin ${compact?'compact':''}`}><ShieldCheck size={compact?11:13}/>ADM</span>
}
