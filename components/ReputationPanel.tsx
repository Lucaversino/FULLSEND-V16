import { Activity, ChevronRight, Trophy, Zap } from 'lucide-react'
import ReputationBadge from '@/components/ReputationBadge'
import { reputationProgress, REPUTATION_LEVELS, XP_ACTION_LABELS } from '@/lib/reputation'

type Entry={id?:string|number;action_key:string;points:number;created_at?:string|null;note?:string|null}

export default function ReputationPanel({xp=0,level='ROOKIE',history=[]}:{xp?:number;level?:string;history?:Entry[]}){
  const progress=reputationProgress(xp)
  const currentIndex=REPUTATION_LEVELS.findIndex(x=>x.key===progress.level)
  const nextLevel=currentIndex>=0&&currentIndex<REPUTATION_LEVELS.length-1?REPUTATION_LEVELS[currentIndex+1]:null

  return <section className="reputation-panel">
    <div className="reputation-panel-main">
      <div className="reputation-title-row">
        <div><span>REPUTAÇÃO FULLSEND</span><h2>SEU NÍVEL NA COMUNIDADE</h2></div>
        <ReputationBadge level={level||progress.level} xp={xp}/>
      </div>
      <div className="reputation-xp-row"><strong>{Number(xp||0).toLocaleString('pt-BR')} XP</strong>{nextLevel?<small>Faltam <b>{progress.remaining.toLocaleString('pt-BR')} XP</b> para {nextLevel.key}</small>:<small><b>NÍVEL MÁXIMO</b> alcançado</small>}</div>
      <div className="reputation-progress"><span style={{width:`${progress.percent}%`}}/></div>
      <div className="reputation-roadmap">
        {REPUTATION_LEVELS.map((item,index)=><div key={item.key} className={`${index<=currentIndex?'reached':''} ${item.key===progress.level?'current':''}`}><i/>{item.key}</div>)}
      </div>
      <div className="reputation-rules">
        <span><Zap size={14}/><b>+40 XP</b> anúncio publicado</span>
        <span><Zap size={14}/><b>+50 XP</b> evento aprovado</span>
        <span><Zap size={14}/><b>+5 XP</b> presença em evento</span>
        <span><Zap size={14}/><b>+3 XP</b> favorito recebido</span>
        <span><Zap size={14}/><b>+2 XP</b> mensagem válida</span>
      </div>
    </div>
    <div className="reputation-history">
      <div className="reputation-history-head"><Activity size={16}/><div><span>ATIVIDADE DE XP</span><b>ÚLTIMOS GANHOS</b></div></div>
      {history.length?<div className="reputation-history-list">{history.slice(0,8).map((item,i)=><div key={item.id||`${item.action_key}-${i}`}><span><b>{XP_ACTION_LABELS[item.action_key]||item.action_key}</b><small>{item.created_at?new Date(item.created_at).toLocaleDateString('pt-BR'):'FULLSEND'}</small></span><em className={Number(item.points)>=0?'positive':'negative'}>{Number(item.points)>=0?'+':''}{item.points} XP</em></div>)}</div>:<div className="reputation-history-empty"><Trophy size={24}/><p>Interaja com a comunidade para começar a ganhar XP.</p></div>}
      <div className="reputation-history-foot">XP possui limites e proteção contra ações repetidas para manter o ranking justo.<ChevronRight size={13}/></div>
    </div>
  </section>
}
