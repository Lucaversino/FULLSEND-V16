import { slugifyEvent } from '@/lib/events-shared'

export const SYMPLA_AUTOMOTIVE_KEYWORDS = [
  'encontro de carros',
  'carros rebaixados',
  'carros antigos',
  'drift',
  'arrancada',
  'track day',
  'automobilismo',
  'som automotivo',
]

type ImportSearch = {
  keyword:string
  pages:number
}

function clean(v:unknown){ return String(v ?? '').trim() }
function first<T=any>(...values:T[]){ return values.find((v:any)=>v!==undefined&&v!==null&&v!=='') as T|undefined }

function stableId(value:string){
  let h=2166136261
  for(let i=0;i<value.length;i++){
    h^=value.charCodeAt(i)
    h=Math.imul(h,16777619)
  }
  return (h>>>0).toString(36)
}

function normalizeDate(value:any){
  const s=clean(value)
  if(!s)return null
  const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if(iso)return `${iso[1]}-${iso[2]}-${iso[3]}`
  const br=s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/)
  if(br)return `${br[3]}-${br[2].padStart(2,'0')}-${br[1].padStart(2,'0')}`
  const parsed=new Date(s)
  if(!Number.isNaN(parsed.getTime()))return parsed.toISOString().slice(0,10)
  return null
}

function normalizeTime(value:any){
  const s=clean(value)
  if(!s)return null
  const m=s.match(/(\d{1,2}):(\d{2})/)
  return m?`${m[1].padStart(2,'0')}:${m[2]}:00`:null
}

function extractImage(i:any){
  const candidates=[
    i?.image_url,i?.imageUrl,i?.image,i?.cover_url,i?.coverUrl,i?.cover,
    i?.banner_url,i?.bannerUrl,i?.thumbnail_url,i?.thumbnailUrl,i?.thumbnail,
    i?.images?.[0]?.url,i?.images?.[0]?.webpUrl,i?.images?.[0],
    i?.media?.images?.[0]?.url,i?.media?.images?.[0],
  ]
  for(const v of candidates){
    if(typeof v==='string'&&/^https?:\/\//.test(v))return v
    if(v&&typeof v==='object'){
      const u=first(v.url,v.webpUrl,v.src,v.imageUrl)
      if(typeof u==='string'&&/^https?:\/\//.test(u))return u
    }
  }
  return null
}

function categoryFromText(value:string){
  const t=value.toLowerCase()
  if(/drift/.test(t))return 'Drift'
  if(/track\s*day|trackday/.test(t))return 'Track Day'
  if(/arrancad|drag/.test(t))return 'Arrancada'
  if(/rebaixad|stance/.test(t))return 'Carros Rebaixados'
  if(/antig|cl[aá]ssic|classic|vintage/.test(t))return 'Carros Antigos'
  if(/off.?road|4x4/.test(t))return 'Off-road'
  if(/som automot|car audio|pared[aã]o/.test(t))return 'Som Automotivo'
  if(/automobil|motorsport|corrida|racing|stock car/.test(t))return 'Motorsport'
  if(/expo|show/.test(t))return 'Exposição'
  return 'Encontro'
}

function cityStateFromLocation(i:any){
  const loc=i?.location||i?.place||i?.venue||i?.address||{}
  const city=clean(first(
    i?.city,loc?.city,loc?.cidade,i?.address?.city,i?.venue?.city
  ))||null
  const stateRaw=clean(first(
    i?.state,loc?.state,loc?.uf,loc?.estado,i?.address?.state,i?.venue?.state
  ))
  const state=stateRaw?stateRaw.toUpperCase().slice(0,2):null
  const venue=clean(first(
    i?.venue_name,i?.venueName,i?.place_name,i?.placeName,
    typeof i?.venue==='string'?i.venue:undefined,
    loc?.name,loc?.title
  ))||null
  const address=clean(first(
    i?.address_text,i?.addressText,
    typeof i?.address==='string'?i.address:undefined,
    loc?.address,loc?.formattedAddress,loc?.display
  ))||null
  return {city,state,venue,address}
}

function normalizeSymplaItem(i:any,keyword:string){
  const title=clean(first(i?.title,i?.name,i?.event_name,i?.eventName))
  const url=clean(first(i?.url,i?.link,i?.event_url,i?.eventUrl,i?.external_url,i?.externalUrl))
  if(!title||!url)return null

  const dates=i?.dates||i?.date||i?.schedule||{}
  const start=first(
    i?.event_date,i?.eventDate,i?.start_date,i?.startDate,
    dates?.startDate,dates?.start,dates?.date,
    i?.date
  )
  const event_date=normalizeDate(start)
  if(!event_date)return null

  const end_date=normalizeDate(first(i?.end_date,i?.endDate,dates?.endDate,dates?.end))
  const event_time=normalizeTime(first(
    i?.event_time,i?.eventTime,i?.start_time,i?.startTime,
    dates?.startTime,dates?.time,i?.time
  ))
  const {city,state,venue,address}=cityStateFromLocation(i)
  const description=clean(first(i?.description,i?.summary,i?.details,i?.about,i?.subtitle))||null
  const text=[title,description,keyword,i?.category,i?.tags?.join?.(' ')].filter(Boolean).join(' ')
  const rawId=clean(first(i?.id,i?.event_id,i?.eventId,i?.external_id,i?.externalId))
  const external_id=rawId||`sympla-${stableId(url)}`
  const slug=`${slugifyEvent([title,city,state,event_date.slice(0,4)].filter(Boolean).join(' '))}-${stableId(external_id).slice(-6)}`
  const latitude=Number(first(i?.latitude,i?.lat,i?.location?.latitude,i?.location?.lat))
  const longitude=Number(first(i?.longitude,i?.lng,i?.lon,i?.location?.longitude,i?.location?.lng,i?.location?.lon))

  return {
    external_id,
    slug,
    title,
    description,
    category:categoryFromText(text),
    event_date,
    end_date,
    event_time,
    venue,
    address,
    city,
    state,
    country:'BR',
    latitude:Number.isFinite(latitude)?latitude:null,
    longitude:Number.isFinite(longitude)?longitude:null,
    image_url:extractImage(i),
    ticket_url:url,
    source_url:url,
    source:'sympla_gecko',
  }
}

async function geckoExtract(payload:any){
  const key=(process.env.GECKO_API_KEY||'').trim()
  if(!key)throw new Error('GECKO_API_KEY não configurada na Vercel.')

  let lastError=''
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const r=await fetch('https://api.geckoapi.com.br/v1/extract',{
        method:'POST',
        cache:'no-store',
        headers:{
          Authorization:`Bearer ${key}`,
          'Content-Type':'application/json',
        },
        body:JSON.stringify(payload),
        signal:AbortSignal.timeout(45000),
      })
      const text=await r.text()
      let json:any
      try{json=JSON.parse(text)}catch{json={raw:text}}
      if(r.ok)return json
      lastError=clean(first(json?.message,json?.error,json?.details?.message))||`HTTP ${r.status}`
      if(![408,425,429,500,502,503,504].includes(r.status))break
    }catch(err){
      lastError=err instanceof Error?err.message:String(err)
    }
    if(attempt<3)await new Promise(r=>setTimeout(r,attempt*1500))
  }
  throw new Error(`GeckoAPI/Sympla: ${lastError||'falha desconhecida'}`)
}

function itemsFromResponse(json:any){
  const candidates=[
    json?.data?.items,
    json?.data?.events,
    json?.items,
    json?.events,
    json?.data?.results,
    json?.results,
  ]
  return candidates.find(Array.isArray)||[]
}

export async function fetchSymplaEvents(searches:ImportSearch[]){
  const all=new Map<string,any>()
  const errors:string[]=[]
  const pageDetails:any[]=[]
  let creditsEstimated=0
  let received=0

  for(const search of searches){
    const keyword=clean(search.keyword)
    const pages=Math.min(5,Math.max(1,Math.trunc(Number(search.pages)||1)))
    if(!keyword)continue

    for(let page=1;page<=pages;page++){
      creditsEstimated++
      const searchUrl=`https://www.sympla.com.br/eventos?s=${encodeURIComponent(keyword)}`
      try{
        const json=await geckoExtract({
          target:'sympla.com.br',
          type:'plp',
          url:searchUrl,
          keyword,
          page,
        })
        const items=itemsFromResponse(json)
        received+=items.length
        let valid=0
        for(const raw of items){
          const event=normalizeSymplaItem(raw,keyword)
          if(!event)continue
          valid++
          all.set(event.external_id,event)
        }
        pageDetails.push({keyword,page,received:items.length,valid})
        if(items.length===0)break
      }catch(err){
        const message=err instanceof Error?err.message:String(err)
        errors.push(`${keyword} / pág. ${page}: ${message}`)
        pageDetails.push({keyword,page,received:0,valid:0,error:message})
        break
      }
    }
  }

  return {
    events:[...all.values()],
    errors,
    diagnostics:{
      provider:'GeckoAPI',
      target:'sympla.com.br',
      country:'BR',
      received,
      unique:all.size,
      creditsEstimated,
      pageDetails,
    }
  }
}
