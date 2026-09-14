export const EVENT_CATEGORIES=[
  'Todos',
  'Encontro',
  'Carros Rebaixados',
  'Carros Antigos',
  'Drift',
  'Arrancada',
  'Track Day',
  'Som Automotivo',
  'Off-road',
  'Motorsport',
  'Exposição',
  'Outros',
] as const

export type EventCategory=typeof EVENT_CATEGORIES[number]

export function slugifyEvent(value:string){
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-|-$/g,'')
    .slice(0,90)
}

export function formatEventDate(value:string){
  const d=new Date(`${value}T12:00:00`)
  return Number.isNaN(d.getTime())?value:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})
}

export function formatEventTime(value?:string|null){
  if(!value)return 'Horário a confirmar'
  return value.slice(0,5)
}
