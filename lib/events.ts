import { createClient } from '@/lib/supabase/server'

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

export type AutomotiveEvent={
  id:string
  external_id?:string|null
  slug:string
  title:string
  description?:string|null
  category:string
  event_date:string
  end_date?:string|null
  event_time?:string|null
  venue?:string|null
  address?:string|null
  city?:string|null
  state?:string|null
  country?:string|null
  latitude?:number|null
  longitude?:number|null
  image_url?:string|null
  ticket_url?:string|null
  source_url?:string|null
  source?:string|null
  status?:'pending'|'published'|'rejected'
  featured?:boolean
  created_by?:string|null
  created_at?:string|null
  updated_at?:string|null
  distance_km?:number|null
  attendees_count?:number
}

export type EventSearch={
  page?:number
  state?:string
  city?:string
  category?:string
  dateFrom?:string
  dateTo?:string
  lat?:number
  lng?:number
  radiusKm?:number
}

export const EVENTS_PER_PAGE=12

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

export async function fetchEventsPage(params:EventSearch){
  const supabase=await createClient()
  const page=Math.max(1,Math.trunc(params.page||1))
  const {data,error}=await supabase.rpc('search_events',{
    p_page:page,
    p_page_size:EVENTS_PER_PAGE,
    p_state:params.state||null,
    p_city:params.city||null,
    p_category:params.category||null,
    p_date_from:params.dateFrom||null,
    p_date_to:params.dateTo||null,
    p_lat:Number.isFinite(params.lat)?params.lat:null,
    p_lng:Number.isFinite(params.lng)?params.lng:null,
    p_radius_km:Number.isFinite(params.radiusKm)?params.radiusKm:null,
  })
  if(error)return {data:[] as AutomotiveEvent[],total:0,page,pageSize:EVENTS_PER_PAGE,error:error.message}
  const payload=(data||{}) as any
  return {
    data:Array.isArray(payload.items)?payload.items as AutomotiveEvent[]:[],
    total:Number(payload.total||0),
    page:Number(payload.page||page),
    pageSize:Number(payload.page_size||EVENTS_PER_PAGE),
    error:null as string|null,
  }
}

export async function fetchEventBySlug(slug:string){
  const supabase=await createClient()
  const {data,error}=await supabase.from('events').select('*').eq('slug',slug).eq('status','published').maybeSingle()
  if(error||!data)return null
  const {count}=await supabase.from('event_attendees').select('id',{count:'exact',head:true}).eq('event_id',data.id)
  return {...data,attendees_count:count||0} as AutomotiveEvent
}
