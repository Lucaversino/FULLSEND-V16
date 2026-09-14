import { slugifyEvent } from '@/lib/events-shared'

const KEYWORDS=[
  'car','cars','motorsport','automotive','drift','track day',
  'car show','motor show','racing'
]

function categoryFromText(text:string){
  const t=text.toLowerCase()
  if(/drift/.test(t))return 'Drift'
  if(/track\s*day/.test(t))return 'Track Day'
  if(/arrancad|drag\s*racing/.test(t))return 'Arrancada'
  if(/rebaixad|stance/.test(t))return 'Carros Rebaixados'
  if(/antig|classic|vintage/.test(t))return 'Carros Antigos'
  if(/off.?road|4x4/.test(t))return 'Off-road'
  if(/som automot|car audio/.test(t))return 'Som Automotivo'
  if(/expo|show|motor show|car show/.test(t))return 'Exposição'
  if(/racing|motorsport|corrida/.test(t))return 'Motorsport'
  if(/meet|encontro/.test(t))return 'Encontro'
  return 'Outros'
}

function bestImage(images:any[]){
  if(!Array.isArray(images))return null
  const sorted=[...images].sort((a,b)=>(Number(b?.width)||0)-(Number(a?.width)||0))
  return sorted.find(x=>typeof x?.url==='string')?.url||null
}

function stateCode(venue:any){
  return venue?.state?.stateCode||venue?.state?.name||null
}

export async function fetchTicketmasterEvents(apiKey:string){
  const collected=new Map<string,any>()
  const errors:string[]=[]

  for(const keyword of KEYWORDS){
    try{
      const qs=new URLSearchParams({
        apikey:apiKey,
        keyword,
        countryCode:'BR',
        size:'50',
        sort:'date,asc',
      })
      const response=await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${qs}`,{
        cache:'no-store',
        headers:{Accept:'application/json'},
      })
      if(!response.ok){
        errors.push(`${keyword}: Ticketmaster ${response.status}`)
        continue
      }
      const json=await response.json()
      const events=json?._embedded?.events||[]
      for(const e of events){
        if(e?.id)collected.set(String(e.id),e)
      }
    }catch(err){
      errors.push(`${keyword}: ${err instanceof Error?err.message:String(err)}`)
    }
  }

  const normalized=[...collected.values()].map((e:any)=>{
    const venue=e?._embedded?.venues?.[0]||{}
    const date=e?.dates?.start?.localDate||null
    const time=e?.dates?.start?.localTime||null
    const title=String(e?.name||'Evento automotivo')
    const text=[
      title,
      e?.info,
      e?.pleaseNote,
      ...(Array.isArray(e?.classifications)?e.classifications.map((c:any)=>[
        c?.segment?.name,c?.genre?.name,c?.subGenre?.name
      ].filter(Boolean).join(' ')):[])
    ].filter(Boolean).join(' ')
    const city=venue?.city?.name||null
    const state=stateCode(venue)
    const baseSlug=slugifyEvent([title,city,state,date?.slice(0,4)].filter(Boolean).join(' '))
    return {
      external_id:String(e.id),
      slug:`${baseSlug}-${String(e.id).slice(-6).toLowerCase()}`,
      title,
      description:e?.info||e?.pleaseNote||null,
      category:categoryFromText(text),
      event_date:date,
      end_date:null,
      event_time:time,
      venue:venue?.name||null,
      address:venue?.address?.line1||null,
      city,
      state,
      country:venue?.country?.countryCode||'BR',
      latitude:venue?.location?.latitude?Number(venue.location.latitude):null,
      longitude:venue?.location?.longitude?Number(venue.location.longitude):null,
      image_url:bestImage(e?.images||[]),
      ticket_url:e?.url||null,
      source_url:e?.url||null,
      source:'ticketmaster',
    }
  }).filter((x:any)=>Boolean(x.event_date))

  return {events:normalized,errors}
}
