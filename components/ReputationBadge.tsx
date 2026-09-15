import Image from 'next/image'
import { reputationClass,levelForXp,REPUTATION_LEVELS } from '@/lib/reputation'
import './badge-art.css'

export default function ReputationBadge({level='ROOKIE',compact=false,xp}:{level?:string|null;compact?:boolean;xp?:number|null}){
  const candidate=xp==null?String(level||'ROOKIE').toUpperCase():levelForXp(xp)
  const normalized=REPUTATION_LEVELS.some(x=>x.key===candidate)?candidate:'ROOKIE'
  return <span className={`reputation-badge reputation-${reputationClass(normalized)} ${compact?'compact':''}`} title={xp==null?normalized:`${normalized} • ${Number(xp).toLocaleString('pt-BR')} XP`}>
    <Image src={`/badges/${reputationClass(normalized)}.png`} width={compact?36:64} height={compact?36:64} alt={`Selo ${normalized}`}/><b>{normalized}</b>
  </span>
}
