import { Gauge, Trophy } from 'lucide-react'
import { reputationClass } from '@/lib/reputation'

export default function ReputationBadge({level='ROOKIE',compact=false,xp}:{level?:string|null;compact?:boolean;xp?:number|null}){
  const normalized=String(level||'ROOKIE').toUpperCase()
  return <span className={`reputation-badge reputation-${reputationClass(normalized)} ${compact?'compact':''}`} title={xp==null?normalized:`${normalized} • ${Number(xp).toLocaleString('pt-BR')} XP`}>
    {normalized==='LEGEND'?<Trophy size={compact?10:12}/>:<Gauge size={compact?10:12}/>}<b>{normalized}</b>
  </span>
}
