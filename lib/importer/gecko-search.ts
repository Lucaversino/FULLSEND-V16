import { createAdminClient } from '@/lib/supabase/admin'
import { categorySearchBase, categorySearchBoost, normalizeCategory, type SearchCategory } from '@/lib/importer/search-categories'

type LocationMode='exact'|'region'|'state'|'any'
type SearchInput = {
  keyword: string
  city?: string | null
  state?: string | null
  pages?: number
  searchCategory?: SearchCategory | string | null
  locationMode?: LocationMode | string | null
  dryRun?: boolean
}

type GeckoProp={name?:string;label?:string;value?:string|null}
type GeckoImage={url?:string;webpUrl?:string}
type GeckoItem={
  id?:string|number;url?:string;title?:string;category?:string;categoryId?:number
  price?:number|null;priceDisplay?:string|null;featured?:boolean;professionalAd?:boolean
  chatEnabled?:boolean;listedAt?:string;imageCount?:number;images?:GeckoImage[]
  location?:{city?:string;state?:string;neighborhood?:string;ddd?:string;display?:string}
  properties?:GeckoProp[]
}

function clean(v:unknown){return String(v??'').trim()}
function norm(v:unknown){return clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function prop(ps:GeckoProp[]|undefined,name:string){return ps?.find(p=>p.name===name)?.value??null}
function num(v:any){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isNaN(n)?null:n}
function sleep(ms:number){return new Promise(r=>setTimeout(r,ms))}
function normalizeLocationMode(v?:string|null):LocationMode{return ['exact','region','state','any'].includes(String(v))?v as LocationMode:'exact'}

const REGION_GROUPS:string[][]=[
  ['porto belo','itapema','bombinhas','tijucas','balneario camboriu','camboriu','itajai','navegantes','penha'],
]
function regionCities(city?:string|null){
  const n=norm(city)
  if(!n)return new Set<string>()
  const group=REGION_GROUPS.find(g=>g.includes(n))||[n]
  return new Set(group)
}

async function geckoExtract(payload:any){
  const key=(process.env.GECKO_API_KEY||'').trim()
  if(!key)throw new Error('GECKO_API_KEY não configurada na Vercel.')
  let last:any=null
  const waits=[0,1800,4000]
  for(let attempt=0;attempt<3;attempt++){
    if(waits[attempt])await sleep(waits[attempt])
    try{
      const r=await fetch('https://api.geckoapi.com.br/v1/extract',{
        method:'POST',cache:'no-store',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
        body:JSON.stringify(payload),signal:AbortSignal.timeout(45000),
      })
      const text=await r.text();let json:any
      try{json=JSON.parse(text)}catch{json={raw:text}}
      if(r.ok)return json
      const message=json?.message||json?.error||json?.details?.message||`GeckoAPI HTTP ${r.status}`
      last=new Error(message)
      if(![408,425,429,500,502,503,504].includes(r.status))throw last
    }catch(e:any){last=e;if(attempt===2)break}
  }
  throw new Error(`GeckoAPI falhou após 3 tentativas: ${last?.message||String(last)}`)
}

function locationDecision(item:GeckoItem,city:string|null,state:string|null,mode:LocationMode){
  const itemCity=norm(item.location?.city);const itemState=norm(item.location?.state)
  const wantedCity=norm(city);const wantedState=norm(state)
  if(mode==='any')return {accepted:true,reason:'Sem filtro de localização'}
  if(mode==='state'){
    const ok=!wantedState||itemState===wantedState
    return {accepted:ok,reason:ok?'Mesmo estado':`UF divergente: ${item.location?.state||'não informada'}`}
  }
  if(mode==='region'){
    if(wantedState&&itemState!==wantedState)return {accepted:false,reason:`UF divergente: ${item.location?.state||'não informada'}`}
    const allowed=regionCities(city);const ok=!wantedCity||allowed.has(itemCity)
    return {accepted:ok,reason:ok?'Cidade aceita na região próxima':`Fora da região: ${item.location?.city||'cidade não informada'}`}
  }
  if(wantedState&&itemState!==wantedState)return {accepted:false,reason:`UF divergente: ${item.location?.state||'não informada'}`}
  if(wantedCity&&itemCity!==wantedCity)return {accepted:false,reason:`Cidade divergente: ${item.location?.city||'não informada'}`}
  return {accepted:true,reason:'Cidade/UF exatas'}
}

function normalizeItem(i:GeckoItem,searchCategory:SearchCategory){
  const ps=i.properties??[]
  return{source:'olx',external_id:String(i.id),title:i.title!,price:i.price??null,price_display:i.priceDisplay??null,
    external_url:i.url!,city:i.location?.city??null,state:i.location?.state??null,neighborhood:i.location?.neighborhood??null,
    ddd:i.location?.ddd??null,brand:prop(ps,'vehicle_brand'),model:prop(ps,'vehicle_model'),year:num(prop(ps,'regdate')),
    mileage:num(prop(ps,'mileage')),fuel:prop(ps,'fuel'),transmission:prop(ps,'gearbox'),color:prop(ps,'carcolor'),
    vehicle_type:prop(ps,'cartype'),engine_power:prop(ps,'motorpower'),features:prop(ps,'car_features'),category:i.category??null,
    category_id:i.categoryId??null,image_url:i.images?.[0]?.webpUrl||i.images?.[0]?.url||null,images:i.images??[],
    image_count:i.imageCount??i.images?.length??0,professional_ad:i.professionalAd??false,featured:i.featured??false,
    chat_enabled:i.chatEnabled??false,listed_at:i.listedAt??null,raw_data:i,import_search_category:searchCategory,
    status:'active',imported_at:new Date().toISOString(),updated_at:new Date().toISOString()}
}

export async function runGeckoSearch(input:SearchInput){
  const keyword=clean(input.keyword);if(!keyword)throw new Error('Informe o carro ou termo da busca.')
  const city=clean(input.city)||null;const state=clean(input.state).toUpperCase()||null
  const pages=Math.max(1,Math.min(5,Math.trunc(Number(input.pages||1))))
  const searchCategory=normalizeCategory(input.searchCategory);const locationMode=normalizeLocationMode(input.locationMode)
  const boost=categorySearchBoost(searchCategory)
  const query=[keyword,boost,city,state].filter(Boolean).join(' ')
  const base=categorySearchBase(searchCategory);const searchUrl=`${base}?q=${encodeURIComponent(query)}`
  const admin=createAdminClient();let received=0;let imported=0;let locationRejected=0;let accepted=0
  const pageDetails:any[]=[];const acceptedPreview:any[]=[];const rejectedPreview:any[]=[]

  for(let page=1;page<=pages;page++){
    const gj=await geckoExtract({target:'olx.com.br',type:'plp',url:searchUrl,page})
    const items:GeckoItem[]=Array.isArray(gj?.data?.items)?gj.data.items:[];received+=items.length
    const valid:any[]=[]
    for(const i of items.filter(i=>i.id&&i.title&&i.url)){
      const decision=locationDecision(i,city,state,locationMode)
      const preview={id:String(i.id),title:i.title,price:i.price??null,priceDisplay:i.priceDisplay??null,url:i.url,image:i.images?.[0]?.webpUrl||i.images?.[0]?.url||null,city:i.location?.city??null,state:i.location?.state??null,reason:decision.reason}
      if(decision.accepted){accepted++;if(acceptedPreview.length<20)acceptedPreview.push({...preview,accepted:true});valid.push(normalizeItem(i,searchCategory))}
      else{locationRejected++;if(rejectedPreview.length<20)rejectedPreview.push({...preview,accepted:false})}
    }
    let pageImported=0
    if(valid.length&&!input.dryRun){
      const {data,error}=await admin.from('gecko_listings').upsert(valid,{onConflict:'source,external_id',ignoreDuplicates:false}).select('id')
      if(error)throw new Error(`Erro no banco: ${error.message}`)
      pageImported=data?.length??valid.length;imported+=pageImported
    }
    pageDetails.push({page,received:items.length,accepted:valid.length,rejected:items.length-valid.length,imported:pageImported})
    if(items.length===0)break
  }
  return{success:true,dryRun:Boolean(input.dryRun),keyword,city,state,searchCategory,locationMode,pagesProcessed:pageDetails.length,
    received,accepted,imported,locationRejected,searchUrl,pageDetails,acceptedPreview,rejectedPreview}
}
