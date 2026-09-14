export const REPUTATION_LEVELS=[
  {key:'ROOKIE',min:0,next:250},
  {key:'STREET',min:250,next:750},
  {key:'GEARHEAD',min:750,next:1500},
  {key:'BUILDER',min:1500,next:3000},
  {key:'PRO BUILDER',min:3000,next:6000},
  {key:'ELITE',min:6000,next:12000},
  {key:'LEGEND',min:12000,next:null},
] as const

export type ReputationLevel=typeof REPUTATION_LEVELS[number]['key']

export function levelForXp(value:number):ReputationLevel{
  const xp=Math.max(0,Math.trunc(Number(value)||0))
  for(let i=REPUTATION_LEVELS.length-1;i>=0;i--){
    if(xp>=REPUTATION_LEVELS[i].min)return REPUTATION_LEVELS[i].key
  }
  return 'ROOKIE'
}

export function reputationProgress(value:number){
  const xp=Math.max(0,Math.trunc(Number(value)||0))
  const level=levelForXp(xp)
  const current=REPUTATION_LEVELS.find(x=>x.key===level)!
  if(current.next==null)return {level,xp,min:current.min,next:null,remaining:0,percent:100}
  const span=current.next-current.min
  const percent=Math.max(0,Math.min(100,Math.round(((xp-current.min)/span)*100)))
  return {level,xp,min:current.min,next:current.next,remaining:Math.max(0,current.next-xp),percent}
}

export const XP_ACTION_LABELS:Record<string,string>={
  profile_complete:'Perfil completo',
  avatar_added:'Foto de perfil',
  listing_published:'Anúncio publicado',
  event_published:'Evento aprovado',
  event_attendance:'Presença em evento',
  message_sent:'Participação em mensagens',
  favorite_received:'Favorito recebido',
  admin_adjustment:'Ajuste administrativo',
}

export function reputationClass(level?:string|null){
  return String(level||'ROOKIE').toLowerCase().replace(/\s+/g,'-')
}
